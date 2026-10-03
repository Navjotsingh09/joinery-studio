export type ViewMode="front"|"top"|"side"|"3d";
export type ProjectStatus="Draft"|"Presented"|"Accepted"|"Rejected";
export type ItemLayer="Joinery"|"Architecture"|"Services"|"Decor";
export type Material={id:string;code:string;name:string;colour:string;thickness:number;category:string;textureDataUrl?:string};
export type WallSide="north"|"east"|"south"|"west";
export type PlinthStyle="recessed"|"flush"|"none";
export type JoineryItem={
  id:string;name:string;type:string;x:number;y:number;z:number;width:number;height:number;depth:number;
  shelves:number;doors:number;materialId:string;finish:string;notes:string;locked:boolean;hardware:string;
  edgeBanding:string;rotation:number;visible?:boolean;layer?:ItemLayer;groupId?:string;
  carcassMaterialId?:string;doorMaterialId?:string;sideMaterialId?:string;
  plinthStyle?:PlinthStyle;plinthRecess?:number;wallSide?:WallSide
};
export type DesignRules={wallClearance:number;componentGap:number;snap:number;serviceClearance:number};
export type ProjectSnapshot={
  name:string;customer:string;reference:string;status:ProjectStatus;roomWidth:number;roomHeight:number;roomDepth:number;
  rules:DesignRules;items:JoineryItem[];address?:string;notes?:string;archived?:boolean;
  customMaterials?:Material[];floorMaterialId?:string
};
export type Revision={id:string;revision:number;createdAt:string;snapshot:ProjectSnapshot};
export type Project={
  id:string;name:string;customer:string;reference:string;status:ProjectStatus;revision:number;
  roomWidth:number;roomHeight:number;roomDepth:number;rules:DesignRules;items:JoineryItem[];revisions:Revision[];
  createdAt:string;updatedAt:string;address?:string;notes?:string;archived?:boolean;
  customMaterials?:Material[];floorMaterialId?:string
};
