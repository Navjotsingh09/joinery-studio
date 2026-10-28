import bpy,json
from mathutils import Vector
from pathlib import Path
out=Path(__file__).resolve().parents[2]/'public/models/kitchen'
for names,file in [(['Cup-Large-White'],'ceramic-mug'),(['Pot-Big','Pot-Big_Lid','Pot-Big-Lid-Handle'],'cooking-pot')]:
 clones=[];dg=bpy.context.evaluated_depsgraph_get()
 for name in names:
  original=bpy.data.objects[name]
  for mod in original.modifiers:
   if mod.type=='SUBSURF':mod.levels=min(1,mod.levels)
  bpy.context.view_layer.update();mesh=bpy.data.meshes.new_from_object(original.evaluated_get(dg));world=original.matrix_world.copy()
  for v in mesh.vertices:v.co=world@v.co
  obj=bpy.data.objects.new(name+' export',mesh);bpy.context.collection.objects.link(obj);clones.append(obj)
 coords=[v.co for o in clones for v in o.data.vertices];lo=Vector([min(v[k] for v in coords) for k in range(3)]);hi=Vector([max(v[k] for v in coords) for k in range(3)]);size=hi-lo;center=(hi+lo)/2
 for o in clones:
  for v in o.data.vertices:v.co=Vector([(v.co[k]-center[k])/max(size[k],1e-9) for k in range(3)])
  mat=bpy.data.materials.new(file+' PBR');mat.use_nodes=True;bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(.85,.83,.79,1) if file=='ceramic-mug' else (.55,.59,.6,1);bsdf.inputs['Metallic'].default_value=0 if file=='ceramic-mug' else .85;bsdf.inputs['Roughness'].default_value=.24;o.data.materials.clear();o.data.materials.append(mat)
  for p in o.data.polygons:p.material_index=0;p.use_smooth=True
 bpy.ops.object.select_all(action='DESELECT')
 for o in clones:o.select_set(True)
 bpy.context.view_layer.objects.active=clones[0]
 bpy.ops.export_scene.gltf(filepath=str(out/(file+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False)
 print('CONVERTED',json.dumps({'file':file,'vertices':sum(len(o.data.vertices) for o in clones),'bytes':(out/(file+'.glb')).stat().st_size,'original_bounds':list(size)}),flush=True)
 for o in clones:bpy.data.objects.remove(o,do_unlink=True)
