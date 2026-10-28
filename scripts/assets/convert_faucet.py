import bpy,json
from mathutils import Vector
from pathlib import Path
out=Path(__file__).resolve().parents[2]/'public/models/kitchen';out.mkdir(parents=True,exist_ok=True)
obj=bpy.data.objects['Tap'];obj.hide_set(False);obj.hide_viewport=False
for m in obj.modifiers:
 if m.type=='SUBSURF':m.levels=2;m.render_levels=2
bpy.context.view_layer.update();dg=bpy.context.evaluated_depsgraph_get();mesh=bpy.data.meshes.new_from_object(obj.evaluated_get(dg));world=obj.matrix_world.copy();obj.data=mesh;obj.modifiers.clear();obj.parent=None;obj.matrix_world=world
for v in mesh.vertices:v.co=world@v.co
obj.matrix_world.identity()
coords=[v.co for v in mesh.vertices];lo=Vector([min(v[k] for v in coords) for k in range(3)]);hi=Vector([max(v[k] for v in coords) for k in range(3)]);size=hi-lo;center=(hi+lo)/2
for v in mesh.vertices:v.co=Vector([(v.co[k]-center[k])/size[k] for k in range(3)])
mat=bpy.data.materials.new('Faucet metal');mat.use_nodes=True;bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(.6,.64,.66,1);bsdf.inputs['Metallic'].default_value=.9;bsdf.inputs['Roughness'].default_value=.18;mesh.materials.clear();mesh.materials.append(mat)
for poly in mesh.polygons:poly.material_index=0;poly.use_smooth=True
for other in list(bpy.data.objects):
 if other!=obj:bpy.data.objects.remove(other,do_unlink=True)
obj.name='Cross-handle mixer — MattMump CC0';bpy.context.view_layer.objects.active=obj;obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'cross-handle-mixer.glb'),export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False)
print('CONVERTED',json.dumps({'vertices':len(mesh.vertices),'faces':len(mesh.polygons),'bytes':(out/'cross-handle-mixer.glb').stat().st_size,'original_bounds':list(size)}))
