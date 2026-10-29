export function calendarOpenApi({reference,jsonResponse,successSchema}) {
  const object=(properties,required=Object.keys(properties))=>({type:'object',additionalProperties:false,required,properties});
  const id=reference('DatabaseId'),text=maxLength=>({type:'string',maxLength}),date={type:'string',format:'date-time'},nullableId={type:'string',pattern:'^[1-9][0-9]*$',nullable:true};
  const count={type:'integer',minimum:1,maximum:100000},token={type:'string',pattern:'^[a-f0-9]{64}$'},reason={type:'string',minLength:1,maxLength:1000};
  const choice=values=>({type:'string',enum:values});
  const rule=object({offerId:id,usageBasis:choice(['SHARED_ONCE','PER_PERSON','PER_GROUP','PER_UNIT','FIXED']),unitsRequired:count,maxPeoplePerUnit:{...count,nullable:true}},['offerId','usageBasis','unitsRequired']);
  const assignment=object({resourceId:id,quantity:count,allocationMode:choice(['SESSION_SHARED','PER_BOOKING_QUOTA']),preparationMinutes:{type:'integer',minimum:0,maximum:10080},cleanupMinutes:{type:'integer',minimum:0,maximum:10080},note:{...text(1000),nullable:true},rules:{type:'array',maxItems:32,items:rule}},['resourceId','quantity','allocationMode']);
  const offer=object({offerId:id,isEnabled:{type:'boolean'},priceOverrideVnd:{type:'integer',minimum:0,maximum:999999999999999,nullable:true}},['offerId']);
  const slotFields={serviceId:id,placeId:nullableId,startsAt:date,endsAt:date,personCapacity:count,visibility:choice(['PUBLIC','PRIVATE']),salesStatus:choice(['DRAFT','OPEN','CLOSED','CANCELLED']),readinessStatus:choice(['AWAITING_CONFIRMATION','CONFIRMED','UNAVAILABLE']),readinessNote:{...text(1000),nullable:true},offers:{type:'array',maxItems:32,items:offer},assignments:{type:'array',maxItems:32,items:assignment}};
  const resourceFields={code:{type:'string',pattern:'^[A-Z][A-Z0-9_-]{0,39}$'},name:{type:'string',minLength:1,maxLength:150},resourceType:choice(['SINGLE','POOL']),totalQuantity:count,maxPeoplePerUnit:{type:'integer',minimum:1,maximum:1000,nullable:true},supplyContact:{...text(1000),nullable:true}};
  const blockFields={roomId:nullableId,resourceId:nullableId,startsAt:date,endsAt:{...date,nullable:true},quantity:count,reason};
  const slot=object({...slotFields,id,token,readinessConfirmedAt:{...date,nullable:true},archivedAt:{...date,nullable:true}});
  const resource=object({...resourceFields,id,token,archivedAt:{...date,nullable:true}});
  const block=object({...blockFields,id,token,releasedAt:{...date,nullable:true}});
  const paging=[{name:'page',in:'query',schema:{type:'integer',minimum:1,maximum:100000,default:1}},{name:'pageSize',in:'query',schema:{type:'integer',minimum:1,maximum:100,default:20}}];
  const window=['from','to'].map(name=>({name,in:'query',required:true,schema:date,description:'Explicit UTC offset (Z or +07:00); window at most 93 days.'}));
  const param=name=>({name,in:'path',required:true,schema:id});
  const operation=(operationId,summary,response,{body,parameters=[],status=200,publicRoute=false}={})=>({operationId,summary,tags:['Calendar'],security:publicRoute?[]:[{BearerAuth:[]}],parameters,
    ...(body?{requestBody:{required:true,content:{'application/json':{schema:reference(body)}}}}:{}),
    responses:{[status]:jsonResponse('Success; Cache-Control: no-store',reference(response)),default:{$ref:'#/components/responses/ApiError'}}});
  const page=items=>object({items:{type:'array',items},total:{type:'integer',minimum:0},page:{type:'integer',minimum:1},pageSize:{type:'integer',minimum:1,maximum:100}});
  const schemas={
    CalendarCommand:object({expectedToken:token,reason}),
    CalendarSlotCreate:object(slotFields,['serviceId','startsAt','endsAt','personCapacity']),
    CalendarSlotUpdate:object({...slotFields,expectedToken:token,reason},['serviceId','startsAt','endsAt','personCapacity','expectedToken','reason']),
    CalendarResourceCreate:object(resourceFields,['code','name','resourceType','totalQuantity']),
    CalendarResourceUpdate:object({name:resourceFields.name,totalQuantity:count,maxPeoplePerUnit:resourceFields.maxPeoplePerUnit,supplyContact:resourceFields.supplyContact,expectedToken:token,reason}),
    CalendarBlockCreate:object(blockFields,['startsAt','endsAt','quantity','reason']),
    CalendarBlockUpdate:object({...blockFields,expectedToken:token},['startsAt','endsAt','quantity','reason','expectedToken']),
    CalendarSlotResponse:successSchema(object({slot,changed:{type:'boolean'},occupiedPeople:{type:'integer',minimum:0},hasExclusiveReservation:{type:'boolean'}},['slot'])),
    CalendarResourceResponse:successSchema(object({resource,changed:{type:'boolean'}},['resource'])),
    CalendarBlockResponse:successSchema(object({block,changed:{type:'boolean'}},['block'])),
    CalendarSlotList:successSchema(page(slot)),CalendarResourceList:successSchema(page(resource)),CalendarBlockList:successSchema(page(block)),
    PublicRoomAvailability:successSchema(object({roomId:id,startsAt:date,endsAt:date,timeZone:choice(['Asia/Ho_Chi_Minh']),available:{type:'boolean'},reason:choice(['AVAILABLE','PAST','CAPACITY','BLOCKED','OCCUPIED'])})),
  };
  const publicSlot=object({id,serviceId:id,placeId:id,startsAt:date,endsAt:date,personCapacity:count,remainingCapacity:{type:'integer',minimum:0},available:{type:'boolean'},
    offers:{type:'array',items:object({offerId:id,pricingType:choice(['PER_PERSON','PER_GROUP','PER_TRIP','FIXED_PACKAGE','PER_HOUR','PER_UNIT']),participationMode:choice(['SHARED','EXCLUSIVE']),unitPriceVnd:reference('VndAmount'),available:{type:'boolean'},remainingCapacity:{type:'integer',minimum:0}})}});
  schemas.PublicServiceSlots=successSchema(object({...page(publicSlot).properties,timeZone:choice(['Asia/Ho_Chi_Minh'])}));
  const paths={},base='/api/v1/households/me/calendar';
  for(const [plural,singular,title] of [['slots','Slot','khung giờ'],['resources','Resource','tài nguyên'],['blocks','Block','lịch chặn']]) {
    const key=`${singular[0].toLowerCase()+singular.slice(1)}Id`;
    const queries=[...paging,...(plural==='resources'?[]:window),{name:plural==='blocks'?'includeReleased':'includeArchived',in:'query',schema:{type:'boolean',default:false}},
      ...(plural==='slots'?[{name:'serviceId',in:'query',schema:id}]:plural==='blocks'?['roomId','resourceId'].map(name=>({name,in:'query',schema:id})):[])];
    paths[`${base}/${plural}`]={get:operation(`calendar-list-${plural}`,`Danh sách ${title} của chính hộ`,`Calendar${singular}List`,{parameters:queries}),post:operation(`calendar-create-${plural}`,`Tạo ${title}; kiểm tra quyền và xung đột`,`Calendar${singular}Response`,{body:`Calendar${singular}Create`,status:201})};
    paths[`${base}/${plural}/{${key}}`]={get:operation(`calendar-get-${plural}`,`Chi tiết ${title}`,`Calendar${singular}Response`,{parameters:[param(key)]}),
      put:operation(`calendar-update-${plural}`,`Cập nhật ${title} với token và lý do`,`Calendar${singular}Response`,{parameters:[param(key)],body:`Calendar${singular}Update`}),
      delete:operation(`calendar-release-${plural}`,plural==='blocks'?'Gỡ lịch chặn; giữ lịch sử':`Lưu trữ ${title}; không hủy cam kết đặt chỗ`,`Calendar${singular}Response`,{parameters:[param(key)],body:'CalendarCommand'})};
  }
  paths['/api/v1/public/services/{serviceId}/slots']={get:operation('public-service-slots','Khung giờ đang mở và sức chứa còn lại; thông tin tham khảo, không giữ chỗ','PublicServiceSlots',{publicRoute:true,parameters:[param('serviceId'),...paging,...window,...['participants','units'].map(name=>({name,in:'query',schema:{...count,default:1}}))]})};
  paths['/api/v1/public/rooms/{roomId}/availability']={get:operation('public-room-availability','Kiểm tra phòng theo ngày nhận/trả tại giờ Việt Nam; không giữ chỗ','PublicRoomAvailability',{publicRoute:true,parameters:[param('roomId'),...['checkInDate','checkOutDate'].map(name=>({name,in:'query',required:true,schema:{type:'string',format:'date'}})),{name:'guests',in:'query',schema:{type:'integer',minimum:1,maximum:1000,default:1}}]})};
  return {paths,schemas};
}
