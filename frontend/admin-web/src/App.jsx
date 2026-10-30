import React,{useEffect,useRef,useState} from 'react';
import gsap from 'gsap';
import {useGSAP} from '@gsap/react';
import {Bed,Compass,House,Leaf,List,MapPin,Shapes,ShieldCheck,SignOut} from '@phosphor-icons/react';
import {ApiClient} from './api.js';
import {ErrorNotice,Field} from './components.jsx';
import {Accounts,Categories,Reviews,reviewKinds} from './pages.jsx';
import {Bookings} from './Bookings.jsx';

gsap.registerPlugin(useGSAP);
const api=new ApiClient({baseUrl:import.meta.env.VITE_API_BASE_URL??'/api/v1'});
export default function App({client=api}) {
  const [user,setUser]=useState(client.user);
  useEffect(()=>client.subscribe(()=>setUser(client.user)),[client]);
  useEffect(()=>{
    if(!user)return;
    const refresh=()=>{if(document.visibilityState==='visible')client.currentUser().catch(()=>{});};
    window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);const timer=setInterval(refresh,60000);
    return()=>{window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);clearInterval(timer);};
  },[client,Boolean(user)]);
  return user?.role==='ADMIN'?<AdminShell api={client} user={user}/>:<Login api={client}/>;
}
function Login({api}) {
  const [error,setError]=useState(null),[busy,setBusy]=useState(false),[visible,setVisible]=useState(false);
  async function submit(event){event.preventDefault();if(busy)return;const data=new FormData(event.currentTarget);setBusy(true);setError(null);try{await api.login({email:data.get('email').trim(),password:data.get('password')});}catch(error){setError(error);}finally{setBusy(false);}}
  return <main className="login-layout"><section className="login-story"><a className="brand" href="/" aria-label="nếp. Quản trị"><Leaf size={30}/><span>nếp.</span></a><div><p className="eyebrow">Không gian quản trị</p><h1>Chăm chút nội dung.<br/>Kết nối cộng đồng.</h1><p>Duyệt hộ dân và những trải nghiệm địa phương, giữ thông tin đáng tin cậy cho mỗi hành trình.</p></div><span className="login-note">Du lịch cộng đồng · Quản trị nền tảng</span></section>
    <section className="login-panel"><div className="login-form"><ShieldCheck size={36} className="accent-icon"/><h2>Đăng nhập quản trị</h2><p className="muted">Dùng tài khoản Admin đã được cấp.</p>{api.notice&&<div className="notice" role="status">{api.notice}</div>}<ErrorNotice error={error}/><form className="form-stack" onSubmit={submit}><fieldset disabled={busy}>
      <Field label="Email" name="email" type="email" autoComplete="username" required maxLength={254}/>
      <Field label="Mật khẩu" name="password" type={visible?'text':'password'} autoComplete="current-password" required maxLength={128}/>
      <label className="check-field"><input type="checkbox" checked={visible} onChange={event=>setVisible(event.target.checked)}/>Hiện mật khẩu</label>
      <button className="primary full-width" type="submit">{busy?'Đang đăng nhập…':'Đăng nhập'}</button>
    </fieldset></form><p className="session-note">Phiên làm việc được giữ trong bộ nhớ trình duyệt. Tải lại trang sẽ cần đăng nhập lại.</p></div></section></main>;
}
const navigation=[['households','Hộ dân',House],['places','Điểm phục vụ',MapPin],['rooms','Phòng lưu trú',Bed],['services','Dịch vụ / trải nghiệm',Compass],['bookings','Đặt chỗ và sổ tiền',List],['categories','Danh mục',Shapes],['accounts','Tài khoản',ShieldCheck]];
function AdminShell({api,user}) {
  const [tab,setTab]=useState('households'),[targetId,setTargetId]=useState(''),[mobileOpen,setMobileOpen]=useState(false),[toast,setToast]=useState(''),[error,setError]=useState(null),[loggingOut,setLoggingOut]=useState(false);
  const content=useRef(null),toastTimer=useRef(null);
  useGSAP(()=>{
    const media=gsap.matchMedia();media.add('(prefers-reduced-motion: no-preference)',()=>{gsap.fromTo('.page-heading',{opacity:0,y:8},{opacity:1,y:0,duration:.25,ease:'power1.out'});});return()=>media.revert();
  },{scope:content,dependencies:[tab],revertOnUpdate:true});
  useEffect(()=>()=>clearTimeout(toastTimer.current),[]);
  function notify(message){clearTimeout(toastTimer.current);setToast(message);toastTimer.current=setTimeout(()=>setToast(''),5000);}
  function change(next){setTab(next);setMobileOpen(false);setError(null);}
  async function logout(){setLoggingOut(true);try{await api.logout();}catch(error){setError(error);}finally{setLoggingOut(false);}}
  return <div className="admin-layout"><aside className={`sidebar ${mobileOpen?'sidebar-open':''}`}><a className="brand" href="/" onClick={event=>{event.preventDefault();change('households');}}><Leaf size={28}/><span>nếp.</span></a><p className="sidebar-caption">QUẢN TRỊ CỘNG ĐỒNG</p><nav aria-label="Điều hướng quản trị">{navigation.map(([key,title,Icon])=><button key={key} aria-current={tab===key?'page':undefined} onClick={()=>change(key)}><Icon size={21}/><span>{title}</span></button>)}</nav><div className="sidebar-foot"><span className="avatar">{user.displayName.slice(0,1)}</span><div><strong>{user.displayName}</strong><small>Quản trị viên</small></div><button className="icon-button" aria-label="Đăng xuất" onClick={logout} disabled={loggingOut}><SignOut/></button></div></aside>
    {mobileOpen&&<button className="sidebar-scrim" aria-label="Đóng điều hướng" onClick={()=>setMobileOpen(false)}/>}
    <div className="admin-main"><header className="admin-topbar"><button className="icon-button mobile-menu" aria-label="Mở điều hướng" aria-expanded={mobileOpen} onClick={()=>setMobileOpen(!mobileOpen)}><List/></button><span>Community Tourism</span><span className="admin-tag">ADMIN</span></header>
      <main ref={content} className="content"><ErrorNotice error={error}/>{reviewKinds[tab]?<Reviews key={tab} api={api} kind={tab} notify={notify} onAccount={id=>{setTargetId(id);change('accounts');}}/>:tab==='bookings'?<Bookings api={api} notify={notify}/>:tab==='categories'?<Categories api={api} notify={notify}/>:<Accounts api={api} targetId={targetId} notify={notify}/>}</main>
      <footer className="admin-footer">nếp. · Nền tảng du lịch cộng đồng <span>Giờ Việt Nam · UTC+7</span></footer>
    </div>{toast&&<div className="toast" role="status">{toast}</div>}
  </div>;
}
