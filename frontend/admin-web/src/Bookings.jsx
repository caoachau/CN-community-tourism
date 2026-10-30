import React,{useState} from 'react';
import {ArrowClockwise} from '@phosphor-icons/react';
import {useRemote} from './pages.jsx';
import {Empty,ErrorNotice,Field,Loading,Modal,Pagination,date,money,Offer} from './components.jsx';

const statuses={PENDING:'Chờ hộ xác nhận',CONFIRMED:'Đã xác nhận',REJECTED:'Hộ từ chối',EXPIRED:'Hết hạn',CANCELLED:'Đã hủy',COMPLETED:'Đã hoàn thành',NO_SHOW:'Khách vắng mặt',INTERRUPTED:'Dừng phục vụ'};
const entries={RECEIPT:'Thu tiền',REFUND:'Thực hoàn',REFUND_AGREEMENT:'Thỏa thuận hoàn',REFUND_ADJUSTMENT:'Điều chỉnh hoàn'};
const methods={CASH:'Tiền mặt',BANK_TRANSFER:'Chuyển khoản',OTHER:'Khác'};
export function Bookings({api,notify}){
  const [tab,setTab]=useState('bookings'),[status,setStatus]=useState(''),[household,setHousehold]=useState(''),[filter,setFilter]=useState(''),[page,setPage]=useState(1),[selected,setSelected]=useState(null),[moderating,setModerating]=useState(null);
  const query={page,pageSize:20,...(filter?{householdId:filter}:{}),...(tab==='bookings'&&status?{status}:{})};
  const state=useRemote(api,`/admin/${tab}`,query);
  return <section><header className="page-heading"><div><p className="eyebrow">Vận hành và đối soát</p><h1>Đặt chỗ và sổ tiền</h1><p>Theo dõi booking nhiều hạng mục, khoản thu/hoàn và đánh giá sau chuyến đi.</p></div><button className="secondary" disabled={state.loading} onClick={state.reload}><ArrowClockwise/>Tải lại</button></header>
    <div className="toolbar"><div className="segmented" role="group" aria-label="Nghiệp vụ đặt chỗ">{[['bookings','Booking'],['financial-entries','Sổ tiền'],['reviews','Đánh giá khách']].map(([value,title])=><button key={value} aria-pressed={tab===value} onClick={()=>{setTab(value);setPage(1);}}>{title}</button>)}</div>
      <form className="inline-filter" onSubmit={e=>{e.preventDefault();setFilter(household);setPage(1);}}><label className="sr-only" htmlFor="booking-household">Mã hộ dân</label><input id="booking-household" placeholder="Lọc theo mã hộ" pattern="[1-9][0-9]{0,19}" value={household} onChange={e=>setHousehold(e.target.value)}/><button className="secondary">Lọc</button></form>
      {tab==='bookings'&&<label>Trạng thái <select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">Tất cả</option>{Object.entries(statuses).map(([value,title])=><option key={value} value={value}>{title}</option>)}</select></label>}
    </div><ErrorNotice error={state.error} onRetry={state.reload}/>{state.loading?<Loading/>:state.data&&<>
      {state.data.items.length===0?<Empty>Chưa có dữ liệu trong bộ lọc này.</Empty>:<div className="table-wrap"><table><thead><tr>{(tab==='bookings'?['Mã đơn / hộ','Khách liên hệ','Trạng thái','Thời gian','Giá trị','']:tab==='financial-entries'?['Chứng từ / hộ','Nội dung','Số tiền','Thời điểm','Hình thức','']:['Đánh giá / hộ','Nội dung','Số sao','Hiển thị','Thời điểm','']).map((h,i)=><th key={i}>{h||<span className="sr-only">Thao tác</span>}</th>)}</tr></thead><tbody>{state.data.items.map(row=><tr key={row.id}>
        {tab==='bookings'?<><td><strong>{row.code}</strong><small>Hộ #{row.householdId}</small></td><td>{row.contact.name}<small>{row.contact.phone}</small></td><td>{statuses[row.status]}</td><td>{date(row.firstStartsAt)}<small>đến {date(row.lastEndsAt)}</small></td><td>{money(row.totalVnd)}</td><td><button className="text-button" onClick={()=>setSelected(row.id)}>Xem đơn</button></td></>
          :tab==='financial-entries'?<><td><strong>#{row.id} · {entries[row.type]??row.type}</strong><small>Hộ #{row.householdId}{row.reversesEntryId&&` · Đảo #${row.reversesEntryId}`}</small></td><td>{row.note}{row.agreementId&&<small>Thỏa thuận #{row.agreementId}</small>}</td><td>{money(row.amountVnd)}</td><td>{date(row.occurredAt)}</td><td>{methods[row.paymentMethod]??'Nghĩa vụ chưa chi tiền'}</td><td><button className="text-button" onClick={()=>setSelected(row.bookingId)}>Đơn #{row.bookingId}</button></td></>
          :<><td>#{row.id}<small>Hộ #{row.householdId} · Đơn #{row.bookingId}</small></td><td className="preserve">{row.comment}</td><td>{row.rating}/5</td><td>{row.hiddenAt?'Đang ẩn':'Công khai'}{row.hiddenReason&&<small>{row.hiddenReason}</small>}</td><td>{date(row.createdAt)}</td><td><button className="text-button" onClick={()=>setModerating(row)}>{row.hiddenAt?'Khôi phục':'Ẩn đánh giá'}</button></td></>}
      </tr>)}</tbody></table></div>}
      {tab==='financial-entries'&&<p className="muted">Thỏa thuận hoàn ghi nghĩa vụ hoàn; thực hoàn ghi khoản chi thực tế. Chứng từ đảo được tính ngược với chứng từ gốc.</p>}
      <Pagination page={page} total={state.data.total} onPage={setPage}/>
    </>}
    {selected&&<BookingDetail api={api} id={selected} onClose={()=>setSelected(null)}/>}
    {moderating&&<ModerateReview api={api} review={moderating} onClose={()=>setModerating(null)} onSaved={()=>{setModerating(null);state.reload();notify('Đã cập nhật hiển thị đánh giá và lưu lý do.');}}/>}
  </section>;
}
function BookingDetail({api,id,onClose}){
  const state=useRemote(api,`/admin/bookings/${id}`),b=state.data?.booking,summary=b?.summary;
  return <Modal title="Chi tiết booking" wide onClose={onClose}><div className="dialog-body"><ErrorNotice error={state.error} onRetry={state.reload}/>{state.loading?<Loading/>:state.data&&<>
    <div className="review-context"><div><h3>{b.code}</h3><p>Hộ #{b.householdId} · {statuses[b.status]}</p><p>{b.contact.name} · {b.contact.phone} · {b.contact.email}</p></div><strong>{money(b.totalVnd)}</strong></div>
    {b.status==='PENDING'&&<div className="notice">Giữ chỗ đến {date(b.holdExpiresAt)}.</div>}{b.closedReason&&<p>Lý do đóng: {b.closedReason}</p>}
    <h3>Hạng mục và điều kiện đã chốt</h3>{state.data.items.map(item=><article className="offer" key={item.id}><header><h4>{item.snapshot.title}</h4><strong>{money(item.totalVnd)}</strong></header><p>{date(item.startsAt)} → {date(item.endsAt)} · {item.participants} khách</p>{item.snapshot.offer?<Offer offer={item.snapshot.offer} snapshot/>:<><p>Bao gồm: {item.snapshot.profile?.terms?.includedItems?.join(', ')||'Không ghi thêm'}</p><p>Không bao gồm: {item.snapshot.profile?.terms?.excludedItems?.join(', ')||'Không ghi thêm'}</p><p>{item.snapshot.profile?.details?.houseRules?.join('\n')}</p></>}{item.addons.map(addon=><p key={addon.key}>{addon.name} ×{addon.quantity} · {money(addon.amount_vnd)}</p>)}</article>)}
    <h3>Đối soát tiền</h3><div className="comparison"><p>Đã thu: {money(summary.receivedVnd)}<br/>Đã hoàn: {money(summary.refundedVnd)}<br/>Đang giữ: {money(summary.netReceivedVnd)}</p><p>Còn phải thu: {money(summary.balanceDueVnd)}<br/>Đã thỏa thuận hoàn: {money(summary.refundAgreedVnd)}<br/>Còn phải hoàn: {money(summary.refundDueVnd)}</p></div>
    {state.data.entries.map(e=><article className="offer" key={e.id}><strong>#{e.id} · {entries[e.type]??e.type} · {money(e.amountVnd)}</strong><p>{e.note}</p><small>{date(e.occurredAt)} · {methods[e.paymentMethod]??'Không phát sinh tiền'}{e.reversesEntryId&&` · Đảo #${e.reversesEntryId}`}</small></article>)}
    <h3>Lịch sử trạng thái</h3>{state.data.history.map((h,i)=><p key={i}>{date(h.createdAt)} · {statuses[h.to]} · {h.reason}</p>)}
    {state.data.review&&<><h3>Đánh giá chuyến đi</h3><p>{state.data.review.rating}/5 · {state.data.review.comment}</p><p>{state.data.review.hiddenAt?'Đang ẩn':'Đang công khai'}</p></>}
  </>}</div></Modal>;
}
function ModerateReview({api,review,onClose,onSaved}){
  const [reason,setReason]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(null);
  async function submit(e){e.preventDefault();if(busy)return;setBusy(true);setError(null);try{await api.request('PATCH',`/admin/reviews/${review.id}`,{body:{expectedToken:review.token,reason:reason.trim(),hidden:!review.hiddenAt}});onSaved();}catch(error){setError(error);}finally{setBusy(false);}}
  return <Modal title={review.hiddenAt?'Khôi phục đánh giá':'Ẩn đánh giá'} onClose={onClose} busy={busy}><form className="dialog-body form-stack" onSubmit={submit}><p>{review.rating}/5 · {review.comment}</p><ErrorNotice error={error}/><Field label="Lý do kiểm duyệt" name="reason" as="textarea" rows={3} required maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)} disabled={busy}/><button className="primary" disabled={busy}>{busy?'Đang lưu…':'Lưu quyết định'}</button></form></Modal>;
}
