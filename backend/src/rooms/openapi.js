export function roomsOpenApi({reference,jsonResponse,successSchema}) {
  const text = maxLength => ({type:'string',minLength:1,maxLength});
  const id = {type:'string',minLength:1,maxLength:20,pattern:'^[1-9][0-9]*$'};
  const date = {type:'string',format:'date-time'}, version={type:'integer',minimum:1,maximum:4294967295};
  const time = {type:'string',pattern:'^(?:[01][0-9]|2[0-3]):[0-5][0-9]$',description:'Local time in Asia/Ho_Chi_Minh, HH:mm. Checkout is on the departure date.'};
  const token = {type:'string',pattern:'^[a-f0-9]{64}$'};
  const object = (properties,required=Object.keys(properties)) => ({type:'object',additionalProperties:false,...(required.length?{required}:{}),properties});
  const strings = maxItems => ({type:'array',maxItems,items:text(500)});
  const detailProperties = {amenities:strings(50),houseRules:strings(32)};
  const termProperties = {includedItems:strings(32),excludedItems:strings(32)};
  const profileProperties = {
    title:text(200),body:{type:'string',maxLength:20000},placeId:{...id,nullable:true},maxGuests:{type:'integer',minimum:1,maximum:1000},
    checkInTime:time,checkOutTime:time,terms:object(termProperties),details:object(detailProperties),
  };
  const inputProperties = {...profileProperties,terms:object(termProperties,[]),details:object(detailProperties,[])};
  const profile = object({revisionId:reference('DatabaseId'),version,...profileProperties,nightlyPriceSnapshotVnd:{type:'integer',minimum:0,maximum:999999999999999,nullable:true},
    schemaVersion:{type:'integer',minimum:1},status:{type:'string',enum:['DRAFT','PENDING','APPROVED','REJECTED']},submittedAt:{...date,nullable:true},
    reviewedBy:{...id,nullable:true},reviewedAt:{...date,nullable:true},reviewNote:{...text(2000),nullable:true},createdAt:date});
  const stateProperties = {supplyStatus:{type:'string',enum:['AVAILABLE','PAUSED','RETIRED']},visibility:{type:'string',enum:['VISIBLE','HIDDEN']}};
  const state = object(stateProperties);
  const root = object({id:reference('DatabaseId'),householdId:reference('DatabaseId'),code:text(40),placeId:{...id,nullable:true},maxGuests:profileProperties.maxGuests,
    nightlyPriceVnd:reference('VndAmount'),pricingToken:token,pricingType:{type:'string',enum:['PER_NIGHT']},checkInTime:time,checkOutTime:time,terms:object(termProperties),...stateProperties,
    publishedRevisionId:{...id,nullable:true},archivedAt:{...date,nullable:true},createdAt:date});
  const viewProperties = {room:root,profile:{...profile,nullable:true},publishedProfile:{...profile,nullable:true}};
  const view = object(viewProperties);
  const locationDetails = object({address:text(500),locality:text(200),directions:text(4000),contactPhone:text(32),coordinates:object({latitude:{type:'number',minimum:-90,maximum:90},longitude:{type:'number',minimum:-180,maximum:180}})},[]);
  const publicRoom = object({id:reference('DatabaseId'),code:text(40),householdId:reference('DatabaseId'),householdName:text(200),revisionId:reference('DatabaseId'),version,...profileProperties,
    nightlyPriceVnd:reference('VndAmount'),pricingType:{type:'string',enum:['PER_NIGHT']},timeZone:{type:'string',enum:['Asia/Ho_Chi_Minh']},
    place:object({id:reference('DatabaseId'),code:text(40),title:text(200),details:locationDetails}),publishedAt:date});
  const page = items => object({items:{type:'array',items},total:{type:'integer',minimum:0},page:{type:'integer',minimum:1,maximum:100000},pageSize:{type:'integer',minimum:1,maximum:100}});
  const paging = [{name:'page',in:'query',schema:{type:'integer',minimum:1,maximum:100000,default:1}},{name:'pageSize',in:'query',schema:{type:'integer',minimum:1,maximum:100,default:20}}];
  const param = name => ({name,in:'path',required:true,schema:reference('DatabaseId')});
  const operation = (operationId,summary,responseName,{body,status=200,publicRoute=false,admin=false,parameters=[],description}={}) => ({
    operationId,summary,tags:[publicRoute?'Public catalog':admin?'Administration':'Rooms'],security:publicRoute?[]:[{BearerAuth:[]}],parameters,...(description?{description}:{}),
    ...(body?{requestBody:{required:true,content:{'application/json':{schema:reference(body)}}}}:{}),
    responses:{[status]:jsonResponse('Success; Cache-Control: no-store',reference(responseName)),
      ...Object.fromEntries([400,401,403,404,409,415,422].map(code=>[code,{$ref:'#/components/responses/ApiError'}])),default:{$ref:'#/components/responses/ApiError'}},
  });
  const own='/api/v1/households/me/rooms',review='/api/v1/admin/room-submissions';
  const roomParams=[param('roomId')],revisionParams=[param('revisionId')];
  return {
    paths:{
      [own]:{get:operation('getOwnedRooms','Danh sách phòng của hộ','OwnedRoomListResponse',{parameters:paging}),
        post:operation('createRoom','Tạo phòng và nội dung nháp','OwnedRoomResponse',{body:'RoomDraftRequest',status:201,description:'Requires an approved household. A room is one individually reservable unit, not an inventory count. An optional draft place must belong to this household.'})},
      [`${own}/{roomId}`]:{get:operation('getOwnedRoom','Xem phòng của chính hộ','OwnedRoomResponse',{parameters:roomParams})},
      [`${own}/{roomId}/profile`]:{put:operation('saveRoomProfile','Lưu phiên bản nội dung phòng mới','OwnedRoomResponse',{parameters:roomParams,body:'RoomSaveRequest',description:'Creates a new immutable DRAFT using the latest revision reference. Pending revisions cannot be edited. Approved content remains public until the next approval.'})},
      [`${own}/{roomId}/submissions`]:{post:operation('submitRoom','Gửi nội dung phòng để xét duyệt','RoomChangeResponse',{parameters:roomParams,body:'RoomSubmitRequest',description:'Requires a complete profile and approved available owned place. Snapshots the current nightly price after checking pricingToken. An identical pending submission is a no-op.'})},
      [`${own}/{roomId}/revisions`]:{get:operation('getRoomRevisions','Lịch sử phiên bản phòng','RoomRevisionListResponse',{parameters:[...roomParams,...paging]})},
      [`${own}/{roomId}/status`]:{patch:operation('setRoomStatus','Đổi tình trạng cung cấp và hiển thị','RoomChangeResponse',{parameters:roomParams,body:'RoomStatusRequest',description:'Uses expectedState and reason. RETIRED cannot reopen. A revoked household can only pause/retire and hide rooms. Existing reservations are preserved.'})},
      [`${own}/{roomId}/pricing`]:{patch:operation('setRoomPrice','Cập nhật giá theo đêm','RoomChangeResponse',{parameters:roomParams,body:'RoomPriceRequest',description:'Whole VND for one room per night, including while content awaits review. Uses expectedToken. Does not rewrite submitted revisions, proposals or bookings.'})},
      [review]:{get:operation('listRoomSubmissions','Danh sách nội dung phòng đã gửi duyệt','RoomSubmissionListResponse',{admin:true,parameters:[...paging,{name:'status',in:'query',schema:{type:'string',enum:['PENDING','APPROVED','REJECTED'],default:'PENDING'}},{name:'householdId',in:'query',schema:id}]})},
      [`${review}/{revisionId}`]:{get:operation('getRoomSubmission','Xem nội dung phòng đã gửi duyệt','OwnedRoomResponse',{admin:true,parameters:revisionParams})},
      [`${review}/{revisionId}/review`]:{post:operation('reviewRoom','Duyệt hoặc từ chối nội dung phòng','RoomChangeResponse',{admin:true,parameters:revisionParams,body:'RoomReviewRequest',description:'Only the latest pending version can be reviewed. Rechecks owner, household, place and active room commitments atomically. Review does not restore supply status or rewrite reservations.'})},
      '/api/v1/public/rooms':{get:operation('listPublicRooms','Tìm phòng đã duyệt và đang cung cấp','PublicRoomListResponse',{publicRoute:true,parameters:[...paging,
        ...['householdId','placeId'].map(name=>({name,in:'query',schema:id})),{name:'q',in:'query',schema:text(100)},
        {name:'guests',in:'query',schema:{type:'integer',minimum:1,maximum:1000}},...['minPriceVnd','maxPriceVnd'].map(name=>({name,in:'query',schema:reference('VndAmount')}))],
        description:'Filters current nightly prices and approved guest capacity. Does not assert date availability or create a hold. Guests is a capacity filter, not price quantity.'})},
      '/api/v1/public/rooms/{roomId}':{get:operation('getPublicRoom','Chi tiết phòng công khai','PublicRoomResponse',{publicRoute:true,parameters:roomParams})},
    },
    schemas:{
      RoomDraftRequest:object({...inputProperties,nightlyPriceVnd:reference('VndAmount')},['title','maxGuests','nightlyPriceVnd']),
      RoomSaveRequest:object({revisionId:reference('DatabaseId'),version,...inputProperties},['revisionId','version','title','maxGuests']),
      RoomSubmitRequest:object({revisionId:reference('DatabaseId'),version,pricingToken:token}),
      RoomPriceRequest:object({expectedToken:token,nightlyPriceVnd:reference('VndAmount'),reason:text(2000)}),
      RoomStatusRequest:object({...stateProperties,expectedState:state,reason:text(2000)}),RoomReviewRequest:reference('PlaceReviewRequest'),
      OwnedRoomResponse:successSchema(view),RoomChangeResponse:successSchema(object({...viewProperties,changed:{type:'boolean'}})),
      OwnedRoomListResponse:successSchema(page(view)),RoomRevisionListResponse:successSchema(page(profile)),
      PublicRoomResponse:successSchema(object({room:publicRoom})),PublicRoomListResponse:successSchema(page(publicRoom)),
      RoomSubmissionListResponse:successSchema(page(object({revisionId:reference('DatabaseId'),roomId:reference('DatabaseId'),householdId:reference('DatabaseId'),version,title:text(200),status:{type:'string',enum:['PENDING','APPROVED','REJECTED']},submittedAt:date,reviewedAt:{...date,nullable:true}}))),
    },
  };
}
