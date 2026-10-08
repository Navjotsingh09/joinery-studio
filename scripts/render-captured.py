"""Render headlessly captured JoineryModel geometry, including the real GLBs."""
import bpy,json,sys,math,base64
from pathlib import Path
from mathutils import Matrix,Vector
args=sys.argv[sys.argv.index('--')+1:]
source,public,output=map(Path,args[:3]);quality=args[3] if len(args)>3 else 'draft'
output.parent.mkdir(parents=True,exist_ok=True)
data=json.loads(source.read_text());project=data['project'];bpy.ops.wm.read_factory_settings(use_empty=True)
B=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)))
def matrix(values):return Matrix([[values[c*4+r] for c in range(4)] for r in range(4)])
def image(path,data_map=False):
 im=bpy.data.images.load(str(path),check_existing=True)
 if data_map:im.colorspace_settings.name='Non-Color'
 return im
cache={}
def material(spec):
 key=json.dumps(spec,sort_keys=True)
 if key in cache:return cache[key]
 mat=bpy.data.materials.new(spec.get('name') or 'Finish');mat.use_nodes=True;nodes,links=mat.node_tree.nodes,mat.node_tree.links;p=nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*spec['colour'],1);p.inputs['Metallic'].default_value=spec['metalness'];p.inputs['Roughness'].default_value=spec['roughness'];p.inputs['Transmission Weight'].default_value=spec.get('transmission',0);p.inputs['IOR'].default_value=spec.get('ior',1.5)
 if spec.get('emissive'):p.inputs['Emission Color'].default_value=(*spec['emissive'],1);p.inputs['Emission Strength'].default_value=spec.get('emissiveIntensity',0)
 maps=spec.get('maps');custom=spec.get('source',{}).get('textureDataUrl')
 if maps:
  coords=nodes.new('ShaderNodeTexCoord');uv=coords.outputs['UV']
  if spec['name'].startswith('floor-'):
   mapping=nodes.new('ShaderNodeMapping');mapping.inputs['Scale'].default_value=(project['roomWidth']/maps['width'],project['roomDepth']/maps['height'],1);links.new(uv,mapping.inputs['Vector']);uv=mapping.outputs['Vector']
  tex=nodes.new('ShaderNodeTexImage');tex.image=image(public/maps['colour'].lstrip('/'));links.new(uv,tex.inputs['Vector'])
  if maps.get('tint'):
   colour=spec['colour'];base=(.398,.216,.085) if spec['name'].startswith('floor-') else (.61,.463,.258)
   tint=nodes.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1;tint.inputs[2].default_value=(*(colour[k]/base[k] for k in range(3)),1);links.new(tex.outputs['Color'],tint.inputs[1]);links.new(tint.outputs[0],p.inputs['Base Color'])
  else:links.new(tex.outputs['Color'],p.inputs['Base Color'])
  rough=nodes.new('ShaderNodeTexImage');rough.image=image(public/maps['roughness'].lstrip('/'),True);links.new(uv,rough.inputs['Vector']);links.new(rough.outputs['Color'],p.inputs['Roughness'])
  normal=nodes.new('ShaderNodeTexImage');normal.image=image(public/maps['normal'].lstrip('/'),True);links.new(uv,normal.inputs['Vector']);n=nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=spec.get('normalStrength',.35);links.new(normal.outputs['Color'],n.inputs['Color']);links.new(n.outputs['Normal'],p.inputs['Normal'])
 elif custom and custom.startswith('data:image/'):
  path=output.parent/('texture-'+str(len(cache))+'.png');path.write_bytes(base64.b64decode(custom.split(',',1)[1]));tex=nodes.new('ShaderNodeTexImage');tex.image=image(path);links.new(tex.outputs['Color'],p.inputs['Base Color'])
 cache[key]=mat;return mat
for number,spec in enumerate(data['meshes']):
 world=B@matrix(spec['matrix']);v=spec['vertices'];vertices=[tuple(world@Vector(v[k:k+3])) for k in range(0,len(v),3)];indices=spec['indices'] or list(range(len(vertices)));faces=[indices[k:k+3] for k in range(0,len(indices),3)]
 mesh=bpy.data.meshes.new('Design mesh');mesh.from_pydata(vertices,[],faces);mesh.update();obj=bpy.data.objects.new('Panel '+str(number),mesh);bpy.context.collection.objects.link(obj)
 for s in spec['materials']:mesh.materials.append(material(s))
 for n,poly in enumerate(mesh.polygons):
  poly.use_smooth=True
  for group in spec['groups']:
   if group['start']<=n*3<group['start']+group['count']:poly.material_index=group.get('materialIndex',0);break
 if spec['uv']:
  layer=mesh.uv_layers.new(name='UVMap')
  for loop in mesh.loops:k=loop.vertex_index*2;layer.data[loop.index].uv=spec['uv'][k:k+2]
 if spec['normals']:
  nm=world.to_3x3().inverted().transposed();normals=spec['normals'];mesh.normals_split_custom_set_from_vertices([tuple((nm@Vector(normals[k:k+3])).normalized()) for k in range(0,len(normals),3)])
for asset in data['assets']:
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(public/'models/kitchen'/(asset['kitchenAsset']+'.glb')));objects=set(bpy.data.objects)-before
 scale=Matrix.Diagonal((*asset['dimensions'],1));transform=B@matrix(asset['matrix'])@scale@B.inverted()
 for obj in objects:
  old=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=transform@old
  if obj.type=='MESH' and asset.get('colour'):
   colour=asset['colour'].lstrip('#');rgb=[int(colour[k:k+2],16)/255 for k in (0,2,4)];linear=[c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in rgb]
   for m in obj.data.materials:
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*linear,1)
    if asset.get('metalness') is not None:p.inputs['Metallic'].default_value=asset['metalness']
    if asset.get('roughness') is not None:p.inputs['Roughness'].default_value=asset['roughness']
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=32 if quality=='draft' else 128;s.cycles.use_denoising=True;s.cycles.max_bounces=10;s.render.resolution_x=1400 if quality=='draft' else 2400;s.render.resolution_y=round(s.render.resolution_x/1.5);s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.filepath=str(output.resolve());s.view_settings.view_transform='AgX';s.view_settings.exposure=math.log2(project.get('lighting',{}).get('exposure',.9))
world=bpy.data.worlds.new('Daylight');world.use_nodes=True;n=world.node_tree.nodes;t=n.new('ShaderNodeTexEnvironment');t.image=image(public/'materials/pbr/studio_small_09.hdr');world.node_tree.links.new(t.outputs['Color'],n['Background'].inputs[0]);n['Background'].inputs[1].default_value=.35;plain=n.new('ShaderNodeBackground');plain.inputs[0].default_value=(.65,.65,.65,1);path=n.new('ShaderNodeLightPath');mix=n.new('ShaderNodeMixShader');world.node_tree.links.new(path.outputs['Is Camera Ray'],mix.inputs[0]);world.node_tree.links.new(n['Background'].outputs[0],mix.inputs[1]);world.node_tree.links.new(plain.outputs[0],mix.inputs[2]);world.node_tree.links.new(mix.outputs[0],n['World Output'].inputs['Surface']);s.world=world
rw=project['roomWidth']/1000;rd=project['roomDepth']/1000;camera=(rw*.55,1.65,rd*.7);target=(-rw*.12,1.2,-rd*.25)
fov=60
if project.get('savedCameras'):camera=project['savedCameras'][0]['position'];target=project['savedCameras'][0]['target'];fov=project['savedCameras'][0]['fov']
bpy.ops.object.camera_add(location=B@Vector(camera));cam=bpy.context.object;cam.rotation_euler=(B@Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=24;cam.data.lens=24/(2*math.tan(math.radians(max(10,min(120,fov)))/2));cam.data.clip_start=.01;cam.data.clip_end=100;s.camera=cam
for name,position,target,power,size,colour in [('Window daylight',(-.5,-rd/2-.8,2),(-.5,0,1),350,2,(1,.95,.88)),('Ceiling bounce',(1,0,3),(0,0,0),120,3,(1,.93,.83)),('Front fill',(2,-3,2.8),(0,0,1),100,3,(.85,.92,1))]:
 light=bpy.data.lights.new(name,'AREA');light.energy=power;light.size=size;light.color=colour;obj=bpy.data.objects.new(name,light);s.collection.objects.link(obj);obj.location=position;obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
output.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(output.with_suffix('.blend').resolve()));bpy.ops.render.render(write_still=True)
