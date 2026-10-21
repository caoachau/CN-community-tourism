import React,{useEffect,useRef} from 'react';
import {ArrowClockwise,CaretLeft,CaretRight,WarningCircle,X,Copy} from '@phosphor-icons/react';

export const labels={DRAFT:'Bản nháp',PENDING:'Chờ xét duyệt',APPROVED:'Đã duyệt',REJECTED:'Cần điều chỉnh',REVOKED:'Đã thu hồi',ACTIVE:'Đang hoạt động',BLOCKED:'Đã khóa',CUSTOMER:'Khách thành viên',HOUSEHOLD:'Chủ hộ',ADMIN:'Quản trị viên',AVAILABLE:'Đang cung cấp',PAUSED:'Tạm ngừng',RETIRED:'Ngừng hẳn',VISIBLE:'Công khai',HIDDEN:'Đang ẩn',SERVICE:'Dịch vụ',PRODUCT:'Sản phẩm',CONTENT:'Nội dung',SHARED:'Bán ghép',EXCLUSIVE:'Thuê riêng',PER_PERSON:'Theo người',PER_GROUP:'Theo nhóm',PER_TRIP:'Theo chuyến',FIXED_PACKAGE:'Gói cố định',PER_HOUR:'Theo giờ',PER_UNIT:'Theo đơn vị'};
export const label=value=>labels[value]??value??'Chưa có';
export const money=value=>`${new Intl.NumberFormat('vi-VN').format(value)}đ`;
export const date=value=>value?new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value)):'Chưa có';
export const ref=profile=>({revisionId:profile.revisionId,version:profile.version});
export function Badge({value}){return <span className={`badge badge-${String(value).toLowerCase()}`}>{label(value)}</span>;}
const issueLabels={email:'Email',password:'Mật khẩu',name:'Tên',code:'Mã danh mục',reason:'Lý do',userId:'Mã tài khoản',title:'Tên giới thiệu',body:'Mô tả',version:'Phiên bản',status:'Trạng thái'};
export function ErrorNotice({error,onRetry}) {
  if(!error)return null;
  return <div className="notice error-notice" role="alert"><WarningCircle size={22} aria-hidden/><div><strong>{error.message??'Chưa thể hoàn tất thao tác. Vui lòng thử lại.'}</strong>
    {error.issues?.length>0&&<ul>{[...new Set(error.issues.map(issue=>issueLabels[issue.path?.[0]]??'Thông tin biểu mẫu'))].map(text=><li key={text}>Kiểm tra {text.toLowerCase()}.</li>)}</ul>}
    {error.requestId&&<small>Mã hỗ trợ: {error.requestId}</small>}{onRetry&&<button className="text-button" onClick={onRetry}><ArrowClockwise/>Thử lại</button>}</div></div>;
}
export function Empty({children}){return <div className="empty-state"><span className="empty-mark" aria-hidden>nếp.</span><p>{children}</p></div>;}
export function Loading(){return <div className="loading" role="status"><span className="spinner" aria-hidden/>Đang tải dữ liệu…</div>;}
export function Pagination({page,total,onPage,busy=false,pageSize=20}){return <nav className="pagination" aria-label="Phân trang"><span>{total} kết quả · Trang {page}</span><div><button className="icon-button" aria-label="Trang trước" disabled={busy||page<=1} onClick={()=>onPage(page-1)}><CaretLeft/></button><button className="icon-button" aria-label="Trang sau" disabled={busy||page*pageSize>=total} onClick={()=>onPage(page+1)}><CaretRight/></button></div></nav>;}
export function Field({label:labelText,name,as='input',children,hint,...props}){const Component=as,id=React.useId();return <div className="field"><label htmlFor={id}>{labelText}{props.required&&<span aria-hidden="true"> *</span>}</label><Component id={id} name={name} aria-describedby={hint?`${id}-hint`:undefined} {...props}>{children}</Component>{hint&&<small id={`${id}-hint`}>{hint}</small>}</div>;}
export function Modal({title,children,onClose,busy=false,wide=false}) {
  const dialog=useRef(null),heading=React.useId();
  useEffect(()=>{const node=dialog.current;node.showModal();return()=>node.close();},[]);
  return <dialog ref={dialog} className={`dialog ${wide?'dialog-wide':''}`} aria-labelledby={heading} onCancel={event=>{event.preventDefault();if(!busy)onClose();}}><header className="dialog-header"><h2 id={heading}>{title}</h2><button type="button" className="icon-button" aria-label="Đóng" disabled={busy} onClick={onClose}><X/></button></header>{children}</dialog>;
}
export function Offer({offer,snapshot=false}) {
  return <article className="offer"><header><h4>{offer.name}</h4><span>{money(offer.unitPriceVnd)} / {offer.unitLabel}</span></header><div className="badge-row"><Badge value={offer.participationMode}/><Badge value={offer.pricingType}/>{!snapshot&&<Badge value={offer.isActive?'AVAILABLE':'PAUSED'}/>}</div>
    <p>{offer.minParticipants}–{offer.maxParticipants} người / hạng mục{offer.pricingType==='PER_UNIT'&&` · Tối đa ${offer.maxUnits} ${offer.unitLabel}, ${offer.participantsPerUnit} người / đơn vị`}</p>
    <p className="preserve">{offer.terms?.scopeDescription}</p>
    {offer.terms?.includedItems?.length>0&&<p>Bao gồm: {offer.terms.includedItems.join(', ')}</p>}{offer.terms?.excludedItems?.length>0&&<p>Không bao gồm: {offer.terms.excludedItems.join(', ')}</p>}
    {offer.addons?.map(addon=><p key={addon.key}>{addon.name}: {money(addon.unitPriceVnd)} · Tối đa {addon.maxQuantity}{!addon.isActive&&' · Đã tắt'}</p>)}
  </article>;
}
export function Profile({profile,kind}) {
  if(!profile)return <Empty>Chưa có bản đang công khai.</Empty>;
  const details=profile.details??{},terms=profile.terms??{};
  const fields=[['Địa chỉ',details.address],['Địa phương',details.locality],['Số liên hệ',details.contactPhone],['Zalo',details.zaloContact],['Chỉ dẫn',details.directions],
    ['Điểm phục vụ',profile.placeId??profile.defaultPlaceId],['Danh mục',profile.categoryId],['Thời lượng',profile.defaultDurationMinutes&&`${profile.defaultDurationMinutes} phút`],['Số khách tối đa',profile.maxGuests],['Nhận phòng',profile.checkInTime],['Trả phòng',profile.checkOutTime],['Giá lúc gửi duyệt',profile.nightlyPriceSnapshotVnd!=null?money(profile.nightlyPriceSnapshotVnd):null]];
  return <article className="profile"><div className="badge-row"><Badge value={profile.status}/><span className="muted">Phiên bản {profile.version}</span></div><h3>{profile.title}</h3><p className="preserve">{profile.body||'Chưa có mô tả.'}</p>
    <dl>{fields.filter(([,value])=>value!=null).map(([key,value])=><React.Fragment key={key}><dt>{key}</dt><dd>{value}</dd></React.Fragment>)}</dl>
    {[['Tiện nghi',details.amenities],['Nội quy',details.houseRules],['Điều kiện tham gia',details.participationConditions],['Khách cần chuẩn bị',details.preparationNotes],['Bao gồm',terms.includedItems],['Không bao gồm',terms.excludedItems]].filter(([,items])=>items?.length).map(([heading,items])=><section key={heading}><h4>{heading}</h4><ul>{items.map((text,i)=><li key={i}>{text}</li>)}</ul></section>)}
    {details.introductionSections?.map((section,i)=><section key={i}><h4>{section.heading}</h4><p className="preserve">{section.text}</p></section>)}
    {profile.offerSnapshots?.length>0&&<section><h4>Phương thức bán tại thời điểm gửi</h4>{profile.offerSnapshots.map(offer=><Offer key={offer.id} offer={offer} snapshot/>)}</section>}
    {profile.reviewNote&&<div className="notice">Kết quả xét duyệt: {profile.reviewNote}</div>}
    <small className="muted">Gửi: {date(profile.submittedAt)} · Xét duyệt: {date(profile.reviewedAt)}</small>
  </article>;
}
export function CopyId({value,label:labelText='Mã tài khoản'}) {
  const [copied,setCopied]=React.useState(false);
  return <button className="copy-button" type="button" onClick={async()=>{try{await navigator.clipboard.writeText(value);setCopied(true);}catch{setCopied(false);}}}><Copy size={16}/>{copied?'Đã sao chép':`${labelText}: ${value}`}</button>;
}
