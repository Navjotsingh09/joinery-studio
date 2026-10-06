export type ViewMode="front"|"top"|"side"|"3d";
export type ProjectStatus="Draft"|"Presented"|"Accepted"|"Rejected";
export type ItemLayer="Joinery"|"Architecture"|"Services"|"Decor";
export type Material={id:string;code:string;name:string;colour:string;thickness:number;category:string;textureDataUrl?:string;textureImage?:string;textureWidthMm?:number;textureHeightMm?:number;textureRotation?:number;textureCrop?:[number,number,number,number];worktopMaterial?:string;worktopStyle?:string;colourFamily?:string;surfaceFinish?:string;splashbackFinish?:string;supplier?:string;supplierUrl?:string;previewImage?:string;splashbackRoom?:string};
export type WallSide="back"|"front"|"left"|"right";
export type PlinthStyle="recessed"|"flush"|"none";
export type JoineryPart="carcass"|"fronts"|"left-side"|"right-side"|"plinth"|"worktop"|"backsplash"|"treads"|"risers"|"railing";
export type JoineryItem={
  id:string;name:string;type:string;x:number;y:number;z:number;width:number;height:number;depth:number;
  shelves:number;doors:number;materialId:string;finish:string;notes:string;locked:boolean;hardware:string;
  edgeBanding:string;rotation:number;visible?:boolean;layer?:ItemLayer;groupId?:string;
  carcassMaterialId?:string;doorMaterialId?:string;sideMaterialId?:string;
  leftSideMaterialId?:string;rightSideMaterialId?:string;plinthMaterialId?:string;worktopMaterialId?:string;
  plinthStyle?:PlinthStyle;plinthRecess?:number;wallSide?:WallSide;
  worktopEdge?:"square"|"rounded";productStyle?:string;colourVariant?:string;openAmount?:number;plinthHeight?:number;wardrobeLayout?:"shelves"|"hanging"|"mixed";stairRisers?:number;stairRailHeight?:number;stairRailing?:"both"|"left"|"right"|"none";treadMaterialId?:string;riserMaterialId?:string;railingMaterialId?:string
};
export type DesignRules={wallClearance:number;componentGap:number;snap:number;serviceClearance?:number};
export type DrawingReference={name:string;dataUrl:string;pixelWidth:number;pixelHeight:number;widthMm:number;x:number;z:number;opacity:number;visible:boolean};
export type ProjectSnapshot={
  name:string;customer:string;reference:string;status:ProjectStatus;roomWidth:number;roomHeight:number;roomDepth:number;
  rules:DesignRules;items:JoineryItem[];address?:string;notes?:string;archived?:boolean;
  customMaterials?:Material[];floorMaterialId?:string;designKind?:"kitchen"|"bedroom"|"stairs";displayUnit?:"mm"|"cm"|"in";drawingReference?:DrawingReference
};
export type Revision={id:string;revision:number;createdAt:string;snapshot:ProjectSnapshot};
export type Project={
  id:string;name:string;customer:string;reference:string;status:ProjectStatus;revision:number;
  roomWidth:number;roomHeight:number;roomDepth:number;rules:DesignRules;items:JoineryItem[];revisions:Revision[];
  createdAt:string;updatedAt:string;cloudVersion?:number;address?:string;notes?:string;archived?:boolean;
  customMaterials?:Material[];floorMaterialId?:string;designKind?:"kitchen"|"bedroom"|"stairs";displayUnit?:"mm"|"cm"|"in";drawingReference?:DrawingReference
};
