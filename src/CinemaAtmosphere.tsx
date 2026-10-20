import type {CSSProperties} from 'react';
import atlas from './assets/cinema-contact-sheet.png';
import type {Film} from './types';
const scenes=[
 {position:'0% 0%',label:'Backwater / blue hour'},
 {position:'50% 0%',label:'City / night exterior'},
 {position:'100% 0%',label:'Desert / golden hour'},
 {position:'0% 100%',label:'Noir / light & shadow'},
 {position:'50% 100%',label:'Coast / storm light'},
 {position:'100% 100%',label:'Monsoon / waiting room'},
];
export function sceneForFilm(f:Film){
 if(f.industry==='Malayalam')return f.genres.includes('Thriller')?5:f.genres.includes('Romance')?0:5;
 if(f.genres.includes('Science fiction'))return f.title.includes('Blade')?1:2;
 return f.genres.includes('War')?4:3;
}
export function FrameStudy({scene=0,className=''}:{scene?:number;className?:string}){
 const selected=scenes[scene%scenes.length];
 const style:CSSProperties={backgroundImage:`url(${atlas})`,backgroundPosition:selected.position};
 return <span className={'frame-study '+className} style={style} aria-hidden="true"/>;
}
export function CinemaAtmosphere(){return <div className="cinema-atmosphere" aria-hidden="true"><div className="ambient-projection"/><div className="ambient-filmstrip">{[0,1,2,3,4,5].map(scene=><div className="ambient-frame" key={scene}><FrameStudy scene={scene}/><span>{String(scene+1).padStart(2,'0')}A</span></div>)}</div><div className="ambient-grain"/></div>}
export function ContactSheet(){return <div className="hero-contact-sheet" aria-hidden="true"><div className="contact-heading"><span>THE LANGUAGE OF CINEMA</span><span>35 MM / VOL. 01</span></div>{[0,1,3].map((scene,i)=><div className={'contact-frame contact-frame-'+i} key={scene}><FrameStudy scene={scene}/><span className="frame-counter">{String(i+1).padStart(2,'0')} / {scenes[scene].label}</span></div>)}<span className="contact-caption">Original atmosphere studies · Light, place & feeling</span></div>}
