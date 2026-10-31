import React,{useEffect,useState} from 'react';
import {ArrowClockwise,Check,Plus,ShieldCheck,WarningCircle,X} from '@phosphor-icons/react';
import {ApiError} from './api.js';
import {MediaGallery} from './MediaGallery.jsx';
import {Badge,CopyId,Empty,ErrorNotice,Field,Loading,Modal,Pagination,Profile,date,label,money} from './components.jsx';

export const reviewKinds={
  households:{title:'Hộ dân',singular:'hộ dân',path:'/admin/household-applications',root:'household'},
  places:{title:'Điểm phục vụ',singular:'điểm phục vụ',path:'/admin/place-submissions',root:'place'},
  rooms:{title:'Phòng lưu trú',singular:'phòng lưu trú',path:'/admin/room-submissions',root:'room'},
  services:{title:'Dịch vụ / trải nghiệm',singular:'dịch vụ',path:'/admin/service-submissions',root:'service'},
};
export function useRemote(api,path,query={}) {
  const [version,setVersion]=useState(0),[state,setState]=useState({data:null,error:null,loading:true}),signature=JSON.stringify(query);
  const key=JSON.stringify([path,signature,version]);
  useEffect(()=>{
    let active=true;const controller=new AbortController();setState({key,api,data:null,error:null,loading:true});
    api.request('GET',path,{query:JSON.parse(signature),signal:controller.signal}).then(data=>{if(active)setState({key,api,data,error:null,loading:false});}).catch(error=>{if(active&&!controller.signal.aborted)setState({key,api,data:null,error,loading:false});});
    return()=>{active=false;controller.abort();};
  },[api,path,signature,version]);
  // Effects run after rendering: never expose a previous tab's differently shaped data.
  const current=state.key===key&&state.api===api?state:{data:null,error:null,loading:true};
  return {...current,reload:()=>setVersion(value=>value+1)};
}
export function Reviews({api,kind,onAccount,notify}) {
  const config=reviewKinds[kind],[status,setStatus]=useState('PENDING'),[page,setPage]=useState(1),[householdId,setHouseholdId]=useState(''),[filter,setFilter]=useState(''),[selected,setSelected]=useState(null);
  const state=useRemote(api,config.path,{status,page,pageSize:20,...(kind!=='households'&&filter?{householdId:filter}:{})});
  return <section><header className="page-heading"><div><p className="eyebrow">Kiểm duyệt nội dung</p><h1>{config.title}</h1><p>Duyệt đúng phiên bản được gửi. Bản đã duyệt tiếp tục công khai trong lúc chờ bản sửa.</p></div><button className="secondary" onClick={state.reload} disabled={state.loading}><ArrowClockwise/>Tải lại</button></header>
    <div className="toolbar"><div className="segmented" role="group" aria-label="Lọc trạng thái">{['PENDING','APPROVED','REJECTED'].map(value=><button key={value} aria-pressed={status===value} onClick={()=>{setStatus(value);setPage(1);}}>{label(value)}</button>)}</div>
      {kind!=='households'&&<form className="inline-filter" onSubmit={event=>{event.preventDefault();if(!householdId||/^[1-9][0-9]{0,19}$/.test(householdId)){setFilter(householdId);setPage(1);}}}><label className="sr-only" htmlFor="household-filter">Mã hộ dân</label><input id="household-filter" placeholder="Lọc theo mã hộ" value={householdId} onChange={event=>setHouseholdId(event.target.value)} inputMode="numeric" pattern="[1-9][0-9]{0,19}"/><button className="secondary" type="submit">Lọc</button></form>}
    </div>
    <ErrorNotice error={state.error} onRetry={state.reload}/>{state.loading?<Loading/>:state.data&&<>
      {state.data.items.length===0?<Empty>Chưa có hồ sơ {config.singular} trong trạng thái này.</Empty>:<div className="table-wrap"><table><thead><tr><th>Nội dung gửi duyệt</th><th>Phiên bản</th><th>Trạng thái</th><th>Thời điểm gửi</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{state.data.items.map(row=><tr key={row.revisionId}><td><strong>{row.title}</strong><small>Hộ #{row.householdId}{row.code&&` · ${row.code}`}</small></td><td>{row.version}</td><td><Badge value={row.status}/></td><td>{date(row.submittedAt)}</td><td><button className="text-button" onClick={()=>setSelected(row)}>Xem hồ sơ<span className="sr-only"> {row.title}</span></button></td></tr>)}</tbody></table></div>}
      <Pagination page={page} total={state.data.total} onPage={setPage}/>
    </>}
    {selected&&<ReviewDetail api={api} config={config} selected={selected} onClose={()=>setSelected(null)} onAccount={onAccount} onChanged={decision=>{state.reload();setSelected(null);notify(decision==='APPROVED'?'Đã duyệt nội dung.':'Đã gửi kết quả cần điều chỉnh.');}}/>}
  </section>;
}
function ReviewDetail({api,config,selected,onClose,onChanged,onAccount}) {
  const state=useRemote(api,`${config.path}/${selected.revisionId}`),[reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(null);
  async function review(decision){
    if(busy)return;if(decision==='REJECTED'&&!reason.trim()){setError(new ApiError('VALIDATION_ERROR',{issues:[{path:['reason']}]}));return;}
    setBusy(true);setError(null);
    try{await api.request('POST',`${config.path}/${selected.revisionId}/review`,{body:{version:state.data.profile.version,decision,...(reason.trim()?{reason:reason.trim()}:{})}});onChanged(decision);}
    catch(error){setError(error);}finally{setBusy(false);}
  }
  const root=state.data?.[config.root],user=state.data?.user;
  return <Modal title={`Xét duyệt ${config.singular}`} wide onClose={onClose} busy={busy}>
    <div className="dialog-body"><ErrorNotice error={state.error} onRetry={state.reload}/>{state.loading?<Loading/>:state.data&&<>
      <div className="review-context"><div><span className="muted">Hộ #{root?.householdId??root?.id}</span><div className="badge-row">{root?.approvalStatus&&<Badge value={root.approvalStatus}/>} {root?.supplyStatus&&<Badge value={root.supplyStatus}/>} {root?.visibility&&<Badge value={root.visibility}/>}</div></div>
        {user&&<div><strong>{user.displayName}</strong><p>{user.email}</p><CopyId value={user.id}/><button className="text-button" onClick={()=>{onClose();onAccount(user.id);}}>Quản lý tài khoản</button></div>}
      </div>
      {config.root==='room'&&<div className="notice">Giá hiện hành: <strong>{money(root.nightlyPriceVnd)} / đêm</strong>. Duyệt nội dung không thay đổi giá hiện hành hoặc cam kết cũ.</div>}
      <div className="comparison"><section><h2 className="column-heading">Đang công khai</h2><Profile profile={state.data.publishedProfile} kind={config.root}/>{config.root!=='place'&&state.data.publishedProfile&&<MediaGallery api={api} revisionId={state.data.publishedProfile.revisionId}/>}</section><section><h2 className="column-heading">Phiên bản được gửi</h2><Profile profile={state.data.profile} kind={config.root}/>{config.root!=='place'&&<MediaGallery api={api} revisionId={state.data.profile.revisionId}/>}</section></div>
      <ErrorNotice error={error}/>
      {state.data.profile.status==='PENDING'?<div className="review-actions"><Field label="Ghi chú xét duyệt" name="reviewReason" as="textarea" rows={3} maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)} disabled={busy} hint="Bắt buộc nêu lý do khi yêu cầu điều chỉnh."/>
        <div className="button-row"><button className="secondary danger" disabled={busy} onClick={()=>review('REJECTED')}><X/>Yêu cầu điều chỉnh</button><button className="primary" disabled={busy} onClick={()=>review('APPROVED')}><Check/>{busy?'Đang xử lý…':'Duyệt phiên bản này'}</button></div></div>
        :<div className="notice">Phiên bản này đã có kết quả xét duyệt. Không thể thay đổi kết quả cũ.</div>}
    </>}</div>
  </Modal>;
}

export function Categories({api,notify}) {
  const [kind,setKind]=useState('SERVICE'),[active,setActive]=useState(''),[page,setPage]=useState(1),[editing,setEditing]=useState(null),[creating,setCreating]=useState(false);
  const state=useRemote(api,'/admin/categories',{kind,page,pageSize:20,...(active?{isActive:active}:{})});
  return <section><header className="page-heading"><div><p className="eyebrow">Danh mục nền tảng</p><h1>Phân loại nội dung</h1><p>Danh mục dùng chung cho các hộ. Giữ nguyên mã và nhóm khi chỉnh sửa.</p></div><button className="primary" onClick={()=>setCreating(true)}><Plus/>Thêm danh mục</button></header>
    <div className="toolbar"><label>Nhóm <select value={kind} onChange={event=>{setKind(event.target.value);setPage(1);}}>{['SERVICE','PRODUCT','CONTENT'].map(value=><option key={value} value={value}>{label(value)}</option>)}</select></label><label>Hiển thị <select value={active} onChange={event=>{setActive(event.target.value);setPage(1);}}><option value="">Tất cả</option><option value="true">Đang hoạt động</option><option value="false">Đã ngừng</option></select></label><button className="icon-button" aria-label="Tải lại danh mục" onClick={state.reload}><ArrowClockwise/></button></div>
    <ErrorNotice error={state.error} onRetry={state.reload}/>{state.loading?<Loading/>:state.data&&<>
      {state.data.items.length===0?<Empty>Chưa có danh mục phù hợp.</Empty>:<div className="table-wrap"><table><thead><tr><th>Tên danh mục</th><th>Mã</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{state.data.items.map(row=><tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.code}</td><td><Badge value={row.isActive?'ACTIVE':'PAUSED'}/></td><td><button className="text-button" onClick={()=>setEditing(row)}>Chỉnh sửa<span className="sr-only"> {row.name}</span></button></td></tr>)}</tbody></table></div>}
      <Pagination page={page} total={state.data.total} onPage={setPage}/>
    </>}
    {(creating||editing)&&<CategoryForm api={api} initial={editing} kind={kind} onClose={()=>{setCreating(false);setEditing(null);}} onSaved={()=>{setCreating(false);setEditing(null);state.reload();notify('Đã lưu danh mục.');}}/>}
  </section>;
}
function CategoryForm({api,initial,kind,onClose,onSaved}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(null);
  async function submit(event){event.preventDefault();if(busy)return;const fields=new FormData(event.currentTarget),name=fields.get('name').trim(),isActive=fields.get('isActive')==='on',reason=fields.get('reason').trim();
    setBusy(true);setError(null);
    try{await api.request(initial?'PATCH':'POST',initial?`/admin/categories/${initial.id}`:'/admin/categories',{body:initial?{name,isActive,reason,expectedState:{name:initial.name,isActive:initial.isActive}}:{kind:fields.get('kind'),code:fields.get('code').trim().toUpperCase(),name,isActive,reason}});onSaved();}
    catch(error){setError(error);}finally{setBusy(false);}
  }
  return <Modal title={initial?'Chỉnh sửa danh mục':'Thêm danh mục'} onClose={onClose} busy={busy}><form onSubmit={submit} className="dialog-body form-stack"><ErrorNotice error={error}/><fieldset disabled={busy}>
    {initial?<p className="notice">{initial.code} · {label(initial.kind)}</p>:<><Field label="Nhóm nội dung" name="kind" as="select" defaultValue={kind} required>{['SERVICE','PRODUCT','CONTENT'].map(value=><option key={value} value={value}>{label(value)}</option>)}</Field><Field label="Mã danh mục" name="code" required maxLength={50} pattern="[A-Za-z][A-Za-z0-9_]*" hint="Chữ cái, số và dấu gạch dưới; bắt đầu bằng chữ cái."/></>}
    <Field label="Tên danh mục" name="name" required maxLength={150} defaultValue={initial?.name??''}/><label className="check-field"><input type="checkbox" name="isActive" defaultChecked={initial?.isActive??true}/>Đang hoạt động</label>
    <Field label="Lý do thay đổi" name="reason" as="textarea" rows={3} required maxLength={2000}/>
    {initial&&<p className="muted">Ngừng danh mục giữ lại lịch sử và tham chiếu cũ; nội dung liên quan có thể ngừng xuất hiện công khai.</p>}
    <div className="button-row"><button className="secondary" type="button" onClick={onClose}>Đóng</button><button className="primary" type="submit">{busy?'Đang lưu…':'Lưu danh mục'}</button></div>
  </fieldset></form></Modal>;
}

export function Accounts({api,targetId='',notify}) {
  const [id,setId]=useState(targetId),[status,setStatus]=useState('BLOCKED'),[reason,setReason]=useState(''),[confirmation,setConfirmation]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(null),[result,setResult]=useState(null);
  useEffect(()=>setId(targetId),[targetId]);
  function prepare(event){event.preventDefault();setError(null);setResult(null);if(!/^[1-9][0-9]{0,19}$/.test(id)||BigInt(id)>18446744073709551615n||id===api.user?.id){setError(new ApiError('VALIDATION_ERROR',{issues:[{path:['userId']}]}));return;}setConfirmation({id,status,reason:reason.trim()});}
  async function apply(){setBusy(true);setError(null);try{const data=await api.request('PATCH',`/admin/users/${confirmation.id}/status`,{body:{status:confirmation.status,reason:confirmation.reason}});setResult(data);setConfirmation(null);notify('Đã cập nhật trạng thái tài khoản.');}catch(error){setError(error);setConfirmation(null);}finally{setBusy(false);}}
  return <section><header className="page-heading"><div><p className="eyebrow">Quản trị tài khoản</p><h1>Khóa và mở tài khoản</h1><p>Thao tác theo mã tài khoản. Quyền chủ hộ và phê duyệt hộ được quản lý độc lập.</p></div><ShieldCheck className="heading-icon" size={40}/></header>
    <div className="narrow-panel"><ErrorNotice error={error}/><form onSubmit={prepare} className="form-stack"><fieldset disabled={busy}>
      <Field label="Mã tài khoản" name="userId" value={id} onChange={event=>setId(event.target.value.trim())} required pattern="[1-9][0-9]{0,19}" inputMode="numeric" maxLength={20} hint="Có thể lấy mã từ hồ sơ hộ dân. Không được tự khóa tài khoản hiện hành."/>
      <Field label="Trạng thái mới" name="status" as="select" value={status} onChange={event=>setStatus(event.target.value)}><option value="BLOCKED">Khóa tài khoản</option><option value="ACTIVE">Mở hoạt động</option></Field>
      <Field label="Lý do" name="reason" as="textarea" rows={4} value={reason} onChange={event=>setReason(event.target.value)} required maxLength={2000}/>
      <div className="notice"><WarningCircle size={20}/><p>Khóa tài khoản sẽ thu hồi các phiên đăng nhập. Mở lại cần đăng nhập mới và không tự khôi phục phê duyệt hộ hoặc booking đã kết thúc.</p></div>
      <button type="submit" className="primary">Kiểm tra và xác nhận</button>
    </fieldset></form>
    {result&&<div className="result-panel" role="status"><h2>Đã cập nhật tài khoản #{result.user.id}</h2><div className="badge-row"><Badge value={result.user.role}/><Badge value={result.user.status}/></div><p>{result.changed?'Trạng thái đã thay đổi.':'Tài khoản đã ở trạng thái yêu cầu.'} Thu hồi {result.revokedSessionCount} phiên.</p></div>}
    </div>
    {confirmation&&<Modal title="Xác nhận thay đổi tài khoản" busy={busy} onClose={()=>setConfirmation(null)}><div className="dialog-body"><p>Bạn sẽ <strong>{confirmation.status==='BLOCKED'?'khóa':'mở hoạt động'}</strong> tài khoản <strong>#{confirmation.id}</strong>.</p><p className="preserve">Lý do: {confirmation.reason}</p><div className="button-row"><button className="secondary" disabled={busy} onClick={()=>setConfirmation(null)}>Để sau</button><button className={confirmation.status==='BLOCKED'?'primary danger-fill':'primary'} disabled={busy} onClick={apply}>{busy?'Đang xử lý…':'Xác nhận thay đổi'}</button></div></div></Modal>}
  </section>;
}
