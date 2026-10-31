import { statuses } from './schemas.js';

export function bookingsOpenApi({reference:r,jsonResponse,successSchema}){
  const obj=(properties,required=Object.keys(properties))=>({type:'object',additionalProperties:false,properties,required});
  const arr=items=>({type:'array',items}),id=r('DatabaseId'),vnd=r('VndAmount'),text={type:'string'},date={type:'string',format:'date-time'},nilDate={...date,nullable:true};
  const nilId={type:'string',pattern:'^[1-9][0-9]*$',nullable:true},nullableText={type:'string',nullable:true},integer={type:'integer',minimum:1,maximum:100000};
  const token={type:'string',pattern:'^[a-f0-9]{64}$'},key={type:'string',minLength:16,maxLength:100,pattern:'^[A-Za-z0-9_-]+$'},reason={type:'string',minLength:1,maxLength:2000};
  const choice=values=>({type:'string',enum:values}),opaque={type:'object',additionalProperties:true};
  const room=obj({kind:choice(['ROOM']),roomId:id,checkInDate:{type:'string',format:'date'},checkOutDate:{type:'string',format:'date'},participants:{...integer,maximum:1000}});
  const addon=obj({key:{type:'string',pattern:'^[A-Za-z0-9_-]{1,64}$'},quantity:integer});
  const service=obj({kind:choice(['SERVICE']),slotId:id,offerId:id,participants:{...integer,maximum:1000},units:integer,addons:{...arr(addon),maxItems:32}},['kind','slotId','offerId','participants']);
  const cart={householdId:id,items:{type:'array',minItems:1,maxItems:20,items:{oneOf:[room,service]}}};
  const contact=obj({name:{type:'string',minLength:1,maxLength:150},phone:{type:'string',pattern:'^\\+?[0-9][0-9 ()-]{6,30}$'},email:{type:'string',format:'email',nullable:true}},['name','phone']);
  const addonSnapshot=obj({key:text,name:text,quantity:integer,unit_price_vnd:vnd,amount_vnd:vnd});
  const itemFields={kind:choice(['ROOM','SERVICE']),roomId:nilId,serviceId:nilId,offerId:nilId,slotId:nilId,participants:integer,quantity:{type:'number',minimum:0.0001},
    pricingType:choice(['PER_NIGHT','PER_PERSON','PER_GROUP','PER_TRIP','FIXED_PACKAGE','PER_HOUR','PER_UNIT']),isExclusive:{type:'boolean'},checkInDate:{type:'string',format:'date',nullable:true},checkOutDate:{type:'string',format:'date',nullable:true},
    startsAt:date,endsAt:date,unitPriceVnd:vnd,baseAmountVnd:vnd,addonsAmountVnd:vnd,totalVnd:vnd,snapshot:opaque,addons:arr(addonSnapshot)};
  const summary=obj(Object.fromEntries(['receivedVnd','refundedVnd','netReceivedVnd','refundAgreedVnd','refundDueVnd','balanceDueVnd'].map(k=>[k,vnd])));
  const cancellation=obj({id,status:choice(['OPEN','ACCEPTED','WITHDRAWN','CLOSED']),reason:text,createdAt:date,closedAt:nilDate,closedReason:nullableText,resolutionCode:nullableText});
  const notification=obj({id,type:text,title:text,body:text,navigation:opaque,createdAt:date,readAt:nilDate});
  const booking=obj({id,code:text,householdId:id,customerId:nilId,status:choice(statuses),displayStatus:choice([...statuses,'CANCEL_REQUESTED']),pendingCancellation:{...cancellation,nullable:true},source:choice(['ONLINE','OFFLINE','CUSTOM_PROPOSAL']),contact,totalVnd:vnd,firstStartsAt:date,lastEndsAt:date,
    holdExpiresAt:nilDate,confirmedAt:nilDate,closedAt:nilDate,closedReason:nullableText,createdAt:date,summary,token});
  const entry=obj({id,bookingId:id,householdId:id,type:choice(['RECEIPT','REFUND','REFUND_AGREEMENT','REFUND_ADJUSTMENT','OTHER_INCOME','EXPENSE']),amountVnd:{type:'integer'},
    paymentMethod:nullableText,receiptPurpose:nullableText,agreementId:nilId,reversesEntryId:nilId,occurredAt:date,note:text,externalReference:nullableText,createdAt:date});
  const review=obj({id,bookingId:id,householdId:id,rating:{type:'integer',minimum:1,maximum:5},comment:text,hiddenAt:nilDate,hiddenReason:nullableText,createdAt:date,token});
  const detail={booking,allowedActions:arr(choice(['requestCancellation','withdrawCancellation','confirmCancellation','confirm','reject','cancel','complete'])),cancellations:arr(cancellation),serverNow:date,items:arr(obj({...itemFields,id,outcome:choice(['UNRESOLVED','SERVED','PARTIALLY_SERVED','NOT_SERVED'])})),entries:arr(entry),review:{...review,nullable:true},terms:opaque,
    history:arr(obj({from:nullableText,to:choice(statuses),actorType:choice(['CUSTOMER','HOUSEHOLD','SYSTEM']),reason:nullableText,createdAt:date})),replayed:{type:'boolean'},entry};
  const paged=item=>obj({items:arr(item),total:{type:'integer',minimum:0},page:integer,pageSize:{...integer,maximum:100}});
  const schemas={
    BookingCart:obj(cart),BookingHold:obj({...cart,contact,expectedQuoteToken:token,idempotencyKey:key}),BookingCommand:obj({expectedToken:token,reason}),BookingCancellationCommand:obj({expectedToken:token,idempotencyKey:key,reason}),
    BookingNotifications:successSchema(obj({...paged(notification).properties,unreadCount:{type:'integer',minimum:0}})),BookingNotification:successSchema(obj({notification})),
    BookingQuoteResponse:successSchema(obj({quote:obj({householdId:id,householdTitle:text,items:arr(obj({...itemFields,usages:arr(obj({assignmentId:id,quantity:integer,snapshot:opaque}))})),
      totalVnd:vnd,firstStartsAt:date,lastEndsAt:date,timeZone:choice(['Asia/Ho_Chi_Minh']),token,canHold:{type:'boolean'},holdExpiresAt:date,holdPolicyVersion:text,holdUnavailableReason:nullableText,serverNow:date})})),
    BookingDetail:successSchema(obj(detail,['booking','items','entries','review','terms','history','cancellations','serverNow','allowedActions'])),BookingList:successSchema(paged(booking)),
    BookingFinancialEntry:obj({expectedToken:token,idempotencyKey:key,type:choice(['RECEIPT','REFUND_AGREEMENT','REFUND_ADJUSTMENT','REFUND']),amountVnd:{type:'integer',minimum:-999999999999999,maximum:999999999999999,description:'Nonzero; negative only for REFUND_ADJUSTMENT.'},
      paymentMethod:{type:'string',enum:['CASH','BANK_TRANSFER','OTHER',null],nullable:true},receiptPurpose:{type:'string',enum:['DEPOSIT','BALANCE',null],nullable:true},agreementId:nilId,
      occurredAt:date,note:reason,externalReference:{type:'string',maxLength:150,nullable:true}},['expectedToken','idempotencyKey','type','amountVnd','occurredAt','note']),
    BookingReversal:obj({expectedToken:token,idempotencyKey:key,occurredAt:date,note:reason}),BookingLedger:successSchema(paged(entry)),
    BookingReviewCreate:obj({rating:{type:'integer',minimum:1,maximum:5},comment:{type:'string',minLength:1,maxLength:4000}}),
    BookingReviewModerate:obj({expectedToken:token,reason,hidden:{type:'boolean'}}),BookingReviewResponse:successSchema(obj({review,replayed:{type:'boolean'}},['review'])),
    BookingReviews:successSchema(obj({...paged(review).properties,averageRating:{type:'number',minimum:1,maximum:5,nullable:true}})),
    PublicBookingReviews:successSchema(obj({...paged(obj({id,rating:{type:'integer',minimum:1,maximum:5},comment:text,createdAt:date})).properties,averageRating:{type:'number',minimum:1,maximum:5,nullable:true}})),
  };
  const paging=['page','pageSize'].map(name=>({name,in:'query',schema:{...integer,maximum:name==='page'?100000:100,default:name==='page'?1:20}}));
  const param=name=>({name,in:'path',required:true,schema:id});
  const householdFilter={name:'householdId',in:'query',schema:id};
  const op=(operationId,summary,response,{body,parameters=[],status=200,publicRoute=false}={})=>({operationId,summary,tags:['Bookings'],security:publicRoute?[]:[{BearerAuth:[]}],parameters,
    ...(body?{requestBody:{required:true,content:{'application/json':{schema:r(body)}}}}:{}),responses:{[status]:jsonResponse('Success; Cache-Control: no-store',r(response)),default:{$ref:'#/components/responses/ApiError'}}});
  const rangeFilters=[{name:'from',in:'query',schema:date},{name:'to',in:'query',schema:date},{name:'source',in:'query',schema:choice(['ONLINE','OFFLINE','CUSTOM_PROPOSAL'])}];
  const paths={
    '/api/v1/bookings/quote':{post:op('booking-quote','Báo giá và kiểm tra toàn bộ giỏ; không giữ chỗ','BookingQuoteResponse',{body:'BookingCart'})},
    '/api/v1/bookings':{get:op('booking-mine','Booking khách đã đặt, bao gồm khách có vai trò HOUSEHOLD','BookingList',{parameters:[...paging,...rangeFilters,householdFilter,{name:'status',in:'query',schema:choice([...statuses,'CANCEL_REQUESTED'])}]}),
      post:op('booking-hold','Giữ chỗ tối đa 24 giờ, kết thúc trước sử dụng 2 giờ, cần ít nhất 30 phút phản hồi; chấp nhận báo giá và khóa chống trùng; idempotencyKey cố định khi thử lại','BookingDetail',{body:'BookingHold',status:201})},
  };
  for(const [base,name]of [['/bookings','customer'],['/households/me/bookings','host'],['/admin/bookings','admin']]){
    if(name!=='customer')paths[`/api/v1${base}`]={get:op(`booking-list-${name}`,'Danh sách booking theo quyền; quản trị chỉ đọc','BookingList',{parameters:[...paging,...rangeFilters,householdFilter,{name:'status',in:'query',schema:choice([...statuses,'CANCEL_REQUESTED'])}]})};
    paths[`/api/v1${base}/{bookingId}`]={get:op(`booking-detail-${name}`,'Booking, các hạng mục, điều kiện chốt, lịch sử, sổ tiền và review','BookingDetail',{parameters:[param('bookingId')]})};
  }
  for(const action of ['confirm','reject','cancel','complete'])paths[`/api/v1${action==='cancel'?'/bookings':'/households/me/bookings'}/{bookingId}/${action}`]={post:op(`booking-${action}`,`${action}: kiểm tra trạng thái, quyền, thời điểm và expectedToken`,'BookingDetail',{body:'BookingCommand',parameters:[param('bookingId')]})};
  paths['/api/v1/households/me/bookings/{bookingId}/cancel']={post:op('booking-host-cancel','Hộ chủ động hủy trước giờ sử dụng, khi chưa có yêu cầu hủy đang mở','BookingDetail',{body:'BookingCommand',parameters:[param('bookingId')]})};
  paths['/api/v1/bookings/{bookingId}/cancel'].post.summary='Legacy: khách nhận CANCELLATION_REQUEST_REQUIRED; dùng cancellation-requests';
  paths['/api/v1/bookings/{bookingId}/cancel'].post.deprecated=true;
  paths['/api/v1/bookings/{bookingId}/cancellation-requests']={post:op('booking-cancellation-request','Gửi yêu cầu hủy; giữ cam kết cho đến khi hộ xác nhận. Không kéo dài hạn đơn PENDING.','BookingDetail',{body:'BookingCancellationCommand',parameters:[param('bookingId')],status:201})};
  for(const [base,action] of [['bookings','withdraw'],['households/me/bookings','confirm']])paths[`/api/v1/${base}/{bookingId}/cancellation-requests/{requestId}/${action}`]={post:op(`booking-cancellation-${action}`,'Rút yêu cầu hoặc hộ xác nhận hủy; idempotent, kiểm token và cam kết gốc','BookingDetail',{body:'BookingCancellationCommand',parameters:[param('bookingId'),param('requestId')]})};
  paths['/api/v1/notifications']={get:op('booking-notifications','Thông báo riêng của tài khoản hiện tại','BookingNotifications',{parameters:[...paging,{name:'unreadOnly',in:'query',schema:choice(['true','false'])}]})};
  paths['/api/v1/notifications/{notificationId}/read']={post:op('booking-notification-read','Đánh dấu thông báo của chính tài khoản là đã đọc','BookingNotification',{parameters:[param('notificationId')]})};
  paths['/api/v1/households/me/bookings/{bookingId}/financial-entries']={post:op('booking-entry','Ghi thu tiền, thỏa thuận hoàn (không phải thực chi) hoặc thực hoàn; chỉ chủ hộ','BookingDetail',{body:'BookingFinancialEntry',parameters:[param('bookingId')],status:201})};
  paths['/api/v1/households/me/bookings/{bookingId}/financial-entries/{entryId}/reverse']={post:op('booking-reversal','Đảo dòng thu/hoàn bằng bút toán mới; không xóa lịch sử','BookingDetail',{body:'BookingReversal',parameters:[param('bookingId'),param('entryId')],status:201})};
  for(const base of ['households/me','admin'])paths[`/api/v1/${base}/financial-entries`]={get:op(`booking-ledger-${base.replace('/','-')}`,'Sổ tiền theo quyền, phân trang','BookingLedger',{parameters:[...paging,householdFilter,{name:'bookingId',in:'query',schema:id}]})};
  paths['/api/v1/bookings/{bookingId}/review']={post:op('booking-review','Khách đánh giá booking đã hoàn thành, tối đa một đánh giá/booking','BookingReviewResponse',{body:'BookingReviewCreate',parameters:[param('bookingId')],status:201})};
  paths['/api/v1/public/households/{householdId}/reviews']={get:op('public-booking-reviews','Review công khai đã kiểm tra booking; không trả thông tin liên hệ','PublicBookingReviews',{publicRoute:true,parameters:[param('householdId'),...paging]})};
  paths['/api/v1/admin/reviews']={get:op('admin-booking-reviews','Review và trạng thái ẩn, điểm trung bình','BookingReviews',{parameters:[...paging,householdFilter]})};
  paths['/api/v1/admin/reviews/{reviewId}']={patch:op('admin-booking-review-moderate','Ẩn hoặc khôi phục review, lưu lý do và audit','BookingReviewResponse',{body:'BookingReviewModerate',parameters:[param('reviewId')]})};
  return {paths,schemas};
}
