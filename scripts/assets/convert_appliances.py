"""Bake the CC0 oven or hood source into a compact, centred glTF component.
Run with BoshIntegratedOven.blend or tp1.blend, with auto-execution disabled.
"""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
oven=any(o.name=='Cube.005' for o in bpy.context.scene.objects)
name='built-in-oven' if oven else 'range-hood'
out=Path(__file__).resolve().parents[2]/'public/models/kitchen';out.mkdir(parents=True,exist_ok=True)
originals=[o for o in bpy.context.scene.objects if o.type=='MESH' and (not oven or o.name=='Cube.005')]
clones=[];materials={}
for original in originals:
 for mod in original.modifiers:
  if mod.type=='SUBSURF':mod.levels=min(mod.levels,1)
 if oven:
  reduction=original.modifiers.new('Web delivery reduction','DECIMATE');reduction.ratio=.75;reduction.use_collapse_triangulate=True
 bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get()
 mesh=bpy.data.meshes.new_from_object(original.evaluated_get(dg));world=original.matrix_world.copy()
 for v in mesh.vertices:v.co=world@v.co
 obj=bpy.data.objects.new(original.name+' exported',mesh);bpy.context.collection.objects.link(obj);clones.append(obj)
 old=[m.name if m else '' for m in mesh.materials];mesh.materials.clear()
 for label in old or ['Metal']:
  if label not in materials:
   mat=bpy.data.materials.new(label+' browser PBR');mat.use_nodes=True;p=mat.node_tree.nodes.get('Principled BSDF');dark=any(s in label.lower() for s in ('glass','black','textured'))
   p.inputs['Base Color'].default_value=(.008,.011,.014,1) if dark else (.48,.51,.53,1)
   p.inputs['Metallic'].default_value=.12 if dark else .88;p.inputs['Roughness'].default_value=.12 if 'glass' in label.lower() else .28 if dark else .3
   if 'white' in label.lower():p.inputs['Base Color'].default_value=(.7,.7,.66,1);p.inputs['Metallic'].default_value=.05
   materials[label]=mat
  mesh.materials.append(materials[label])
 for p in mesh.polygons:p.use_smooth=True
 mesh.set_sharp_from_angle(angle=math.radians(35))
 normals=obj.modifiers.new('Preserve flat appliance panels','WEIGHTED_NORMAL');normals.keep_sharp=True
coords=[v.co for o in clones for v in o.data.vertices];lo=Vector([min(v[k] for v in coords) for k in range(3)]);hi=Vector([max(v[k] for v in coords) for k in range(3)]);size=hi-lo;center=(hi+lo)/2
for obj in clones:
 for v in obj.data.vertices:v.co=Vector([(v.co[k]-center[k])/max(size[k],1e-9) for k in range(3)])
bpy.ops.object.select_all(action='DESELECT')
for obj in clones:obj.select_set(True)
bpy.context.view_layer.objects.active=clones[0]
bpy.ops.export_scene.gltf(filepath=str(out/(name+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_apply=True,export_cameras=False,export_lights=False)
print('CONVERTED',json.dumps({'file':name,'vertices':sum(len(o.data.vertices) for o in clones),'bytes':(out/(name+'.glb')).stat().st_size,'original_bounds':list(size)}),flush=True)
