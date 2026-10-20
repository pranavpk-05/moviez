import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
class ErrorBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<main className="section"><h1>Something interrupted the frame.</h1><p>Reload the app to try again.</p><button className="btn primary" onClick={()=>location.reload()}>Reload</button></main>:this.props.children}
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><App/></ErrorBoundary>);
