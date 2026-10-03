import {describe,it,expect} from 'vitest';
import {textureUV,textureDimensions} from '@/lib/textureMapping';
import {MATERIALS} from '@/lib/materials';
describe('physical texture scale',()=>{
  const m={...MATERIALS[0],textureWidthMm:500,textureHeightMm:1000};
  it('keeps one tile per measured width and height',()=>{expect(textureUV(.5,1,m)).toEqual([1,1]);expect(textureUV(2,3,m)).toEqual([4,3])});
  it('rotates physical grain axes while retaining tile dimensions',()=>{expect(textureUV(.5,1,{...m,textureRotation:90})).toEqual([2,-.5])});
  it('bounds imported scales to prevent division by zero',()=>{expect(textureDimensions({...m,textureWidthMm:0}).width).toBe(.05)});
});
