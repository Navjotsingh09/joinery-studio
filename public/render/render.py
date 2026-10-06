"""Render the exported Joinery Studio geometry using Blender 4.x Cycles.
Run: blender --background --python render.py -- scene.glb settings.json final.png
"""
import bpy
import json
import math
import os
import sys
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
if len(args) != 3:
    raise SystemExit('Expected scene.glb settings.json output.png')
model_path, settings_path, output_path = map(os.path.abspath, args)
with open(settings_path, encoding='utf-8') as source:
    settings = json.load(source)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=model_path)
scene = bpy.context.scene
cameras = [o for o in scene.objects if o.type == 'CAMERA']
if not cameras:
    raise SystemExit('The scene has no camera. Export it again from the 3D view.')
scene.camera = cameras[0]
scene.render.engine = 'CYCLES'
scene.cycles.samples = 256
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 10
# CPU is portable. Use an available GPU when Blender supports it on this machine.
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for backend in ('OPTIX', 'CUDA', 'HIP', 'METAL', 'ONEAPI'):
        try:
            prefs.compute_device_type = backend
            prefs.get_devices()
            gpu = [d for d in prefs.devices if d.type != 'CPU']
            if gpu:
                for device in prefs.devices:
                    device.use = device.type != 'CPU'
                scene.cycles.device = 'GPU'
                break
        except Exception:
            continue
except Exception:
    pass
scene.render.resolution_x = 4096
scene.render.resolution_y = max(256, round(4096 / settings.get('aspect', 1.5)))
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.filepath = output_path
scene.view_settings.view_transform = 'AgX'
scene.view_settings.exposure = math.log2(max(.2, settings['lighting']['exposure']))
world = bpy.data.worlds.new('Studio ambient')
world.use_nodes = True
environment_path = os.path.join(os.path.dirname(model_path), 'environment.hdr')
if os.path.isfile(environment_path):
    nodes, links = world.node_tree.nodes, world.node_tree.links
    environment = nodes.new('ShaderNodeTexEnvironment')
    environment.image = bpy.data.images.load(environment_path)
    coords, mapping = nodes.new('ShaderNodeTexCoord'), nodes.new('ShaderNodeMapping')
    mapping.inputs['Rotation'].default_value[2] = .5
    links.new(coords.outputs['Generated'], mapping.inputs['Vector'])
    links.new(mapping.outputs['Vector'], environment.inputs['Vector'])
    links.new(environment.outputs['Color'], nodes['Background'].inputs[0])
    nodes['Background'].inputs[1].default_value = .75
else:
    world.node_tree.nodes['Background'].inputs[0].default_value = (.78, .83, .9, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = .35
scene.world = world
# glTF imports Y-up geometry as Z-up. Light placement below uses Blender Z-up.
def area(name, position, target, power, colour, size):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy, data.color, data.size = power, colour, size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = position
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
area('Daylight softbox', (3.5, -4.5, 6.5), (0, 0, 1), 900 * settings['lighting']['daylight'], (1, .94, .85), 4)
area('Cool fill', (-4, -1, 3), (0, 0, 1), 450, (.83, .9, 1), 3)
area('Ceiling bounce', (0, 0, 5), (0, 0, 0), 700, (1, .96, .9), 4)
# Imported materials, UVs, open doors and apertures are preserved from the app.
bpy.ops.wm.save_as_mainfile(filepath=os.path.splitext(output_path)[0] + '.blend')
bpy.ops.render.render(write_still=True)
