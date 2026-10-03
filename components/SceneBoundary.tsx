"use client";
import {Component,ReactNode} from "react";

export class SceneBoundary extends Component<{children:ReactNode;onUsePlan:()=>void},{failed:boolean;attempt:number}>{
  state={failed:false,attempt:0};
  static getDerivedStateFromError(){return {failed:true};}
  render(){
    if(this.state.failed)return <section role="alert" style={{display:"grid",placeContent:"center",height:"100%",padding:32,textAlign:"center",background:"#f3f1ed"}}>
      <h2>3D view is unavailable in this browser</h2>
      <p style={{maxWidth:440,lineHeight:1.6}}>Your browser could not start the 3D renderer. You can continue designing in the plan and elevations, save your work and export drawings.</p>
      <div style={{display:"flex",justifyContent:"center",gap:12}}>
        <button onClick={this.props.onUsePlan}>Continue in 2D plan</button>
        <button onClick={()=>this.setState(s=>({failed:false,attempt:s.attempt+1}))}>Retry 3D</button>
      </div>
      <p style={{maxWidth:440,fontSize:13,color:"#666"}}>For 3D, use a browser with WebGL and hardware acceleration enabled.</p>
    </section>;
    return <div key={this.state.attempt} style={{height:"100%"}}>{this.props.children}</div>;
  }
}
