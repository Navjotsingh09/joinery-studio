import bpy,json,math
from mathutils import Vector
from pathlib import Path
out=Path(__file__).resolve().parents[2]/'public/models/kitchen';out.mkdir(parents=True,exist_ok=True)
for names,file in [(['Hob.001','Hob2','Hob3','Hob4'],'gas-hob'),(['Kriaukle'],'inset-sink'),(['Ciaupas'],'square-mixer')]:
 clones=[];dg=bpy.context.evaluated_depsgraph_get()
 for name in names:
  original=bpy.data.objects[name]
  for mod in original.modifiers:
   if mod.type=='SUBSURF':mod.levels=0
  bpy.context.view_layer.update();mesh=bpy.data.meshes.new_from_object(original.evaluated_get(dg));world=original.matrix_world.copy()
  for v in mesh.vertices:
   q=world@v.co;v.co=Vector((q.y,-q.x,q.z))
  obj=bpy.data.objects.new(name+' export',mesh);bpy.context.collection.objects.link(obj);clones.append(obj)
 coords=[v.co for o in clones for v in o.data.vertices];lo=Vector([min(v[k] for v in coords) for k in range(3)]);hi=Vector([max(v[k] for v in coords) for k in range(3)]);size=hi-lo;center=(hi+lo)/2
 for o in clones:
  for v in o.data.vertices:v.co=Vector([(v.co[k]-center[k])/max(size[k],1e-9) for k in range(3)])
  oldnames=[m.name if m else '' for m in o.data.materials];o.data.materials.clear()
  # Procedural Cycles materials do not survive glTF. Preserve part distinctions
  # with explicit browser PBR materials instead of exporting broken shaders.
  mat=bpy.data.materials.new(o.name+' PBR');mat.use_nodes=True;bsdf=mat.node_tree.nodes.get('Principled BSDF')
  dark=file=='gas-hob' and 'Hob4' not in o.name or file=='inset-sink'
  bsdf.inputs['Base Color'].default_value=((.035,.04,.045,1) if dark else (.5,.54,.56,1));bsdf.inputs['Metallic'].default_value=.7 if not dark else .2;bsdf.inputs['Roughness'].default_value=.3 if not dark else .25;o.data.materials.append(mat)
  for p in o.data.polygons:p.material_index=0;p.use_smooth=True
 bpy.ops.object.select_all(action='DESELECT')
 for o in clones:o.select_set(True)
 bpy.context.view_layer.objects.active=clones[0]
 bpy.ops.export_scene.gltf(filepath=str(out/(file+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False)
 print('CONVERTED',json.dumps({'file':file,'vertices':sum(len(o.data.vertices) for o in clones),'bytes':(out/(file+'.glb')).stat().st_size,'original_bounds':list(size)}),flush=True)
 for o in clones:bpy.data.objects.remove(o,do_unlink=True)
