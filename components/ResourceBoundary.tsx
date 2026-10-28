"use client";
import {Component,ReactNode} from 'react';
import {SceneResource,setSceneResourceStatus} from '@/lib/sceneResources';
export class ResourceBoundary extends Component<{resource:Omit<SceneResource,'status'|'users'>;children:ReactNode;fallback?:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(){setSceneResourceStatus(this.props.resource,'error')}
 render(){return this.state.failed?this.props.fallback??null:this.props.children}
}
