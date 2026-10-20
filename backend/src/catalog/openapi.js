export function catalogOpenApi({ reference, jsonResponse, successSchema }) {
  const text = maxLength => ({ type:'string',minLength:1,maxLength });
  const id = { type:'string',minLength:1,maxLength:20,pattern:'^[1-9][0-9]*$' };
  const date = { type:'string',format:'date-time' };
  const kinds = { type:'string',enum:['SERVICE','PRODUCT','CONTENT'] };
  const version = { type:'integer',minimum:1,maximum:4294967295 };
  const revisionRef = { revisionId:reference('DatabaseId'),version };
  const placeState = { type:'object',additionalProperties:false,required:['supplyStatus','visibility'],properties:{
    supplyStatus:{ type:'string',enum:['AVAILABLE','PAUSED','RETIRED'] },visibility:{ type:'string',enum:['VISIBLE','HIDDEN'] },
  } };
  const categoryState = { type:'object',additionalProperties:false,required:['name','isActive'],properties:{ name:text(150),isActive:{ type:'boolean' } } };
  const category = { type:'object',additionalProperties:false,required:['id','kind','code','name','isActive','createdAt'],properties:{
    id:reference('DatabaseId'),kind:kinds,code:text(50),...categoryState.properties,createdAt:date,
  } };
  const details = { type:'object',additionalProperties:false,properties:{
    address:text(500),locality:text(200),directions:text(4000),contactPhone:{ type:'string',minLength:8,maxLength:32,pattern:'^\\+?[0-9 ()-]+$' },
    coordinates:{ type:'object',nullable:true,additionalProperties:false,required:['latitude','longitude'],properties:{
      latitude:{ type:'number',minimum:-90,maximum:90 },longitude:{ type:'number',minimum:-180,maximum:180 },
    } },
  } };
  const content = { title:text(200),body:{ type:'string',maxLength:20000 },details };
  const profile = { type:'object',additionalProperties:false,required:['revisionId','version','title','body','details','schemaVersion','status','submittedAt','reviewedBy','reviewedAt','reviewNote','createdAt'],properties:{
    ...revisionRef,...content,schemaVersion:{ type:'integer',minimum:1 },status:{ type:'string',enum:['DRAFT','PENDING','APPROVED','REJECTED'] },
    submittedAt:{ ...date,nullable:true },reviewedBy:{ ...id,nullable:true },reviewedAt:{ ...date,nullable:true },reviewNote:{ ...text(2000),nullable:true },createdAt:date,
  } };
  const place = { type:'object',additionalProperties:false,required:['id','householdId','code','supplyStatus','visibility','publishedRevisionId','archivedAt','createdAt'],properties:{
    id:reference('DatabaseId'),householdId:reference('DatabaseId'),code:text(40),...placeState.properties,publishedRevisionId:{ ...id,nullable:true },archivedAt:{ ...date,nullable:true },createdAt:date,
  } };
  const view = { type:'object',additionalProperties:false,required:['place','profile','publishedProfile'],properties:{ place,profile:{ ...profile,nullable:true },publishedProfile:{ ...profile,nullable:true } } };
  const publicPlace = { type:'object',additionalProperties:false,required:['id','code','householdId','householdName','revisionId','version','title','body','details','publishedAt'],properties:{
    id:reference('DatabaseId'),code:text(40),householdId:reference('DatabaseId'),householdName:text(200),...revisionRef,...content,publishedAt:date,
  } };
  const page = items => ({ type:'object',additionalProperties:false,required:['items','total','page','pageSize'],properties:{
    items:{ type:'array',items },total:{ type:'integer',minimum:0 },page:{ type:'integer',minimum:1,maximum:100000 },pageSize:{ type:'integer',minimum:1,maximum:100 },
  } });
  const paging = [
    { name:'page',in:'query',schema:{ type:'integer',minimum:1,maximum:100000,default:1 } },
    { name:'pageSize',in:'query',schema:{ type:'integer',minimum:1,maximum:100,default:20 } },
  ];
  const param = name => ({ name,in:'path',required:true,schema:reference('DatabaseId') });
  const statusParam = { name:'status',in:'query',schema:{ type:'string',enum:['PENDING','APPROVED','REJECTED'],default:'PENDING' } };
  const kindParam = { name:'kind',in:'query',schema:kinds };
  const householdParam = { name:'householdId',in:'query',schema:reference('DatabaseId') };
  const operation = (operationId,summary,responseName,{ body,status=200,publicRoute=false,admin=false,parameters=[],description }={}) => ({
    operationId,summary,tags:[publicRoute?'Public catalog':admin?'Administration':'Places'],security:publicRoute?[]:[{ BearerAuth:[] }],parameters,
    ...(description?{ description }:{}),
    ...(body?{ requestBody:{ required:true,content:{ 'application/json':{ schema:reference(body) } } } }:{}),
    responses:{ [status]:jsonResponse('Success; Cache-Control: no-store',reference(responseName)),
      ...Object.fromEntries([400,401,403,404,409,415,422].map(code=>[code,{ $ref:'#/components/responses/ApiError' }])),default:{ $ref:'#/components/responses/ApiError' } },
  });
  const owner = '/api/v1/households/me/places';
  const adminCategory = '/api/v1/admin/categories';
  const review = '/api/v1/admin/place-submissions';
  return {
    paths:{
      '/api/v1/public/categories':{ get:operation('getPublicCategories','Danh mục đang hoạt động cho khách','CategoryListResponse',{ publicRoute:true,parameters:[...paging,kindParam],description:'Global taxonomy managed by ADMIN. No authentication required. Inactive categories are excluded; deactivation never deletes referenced records.' }) },
      '/api/v1/public/places':{ get:operation('getPublicPlaces','Tìm điểm phục vụ đã công khai','PublicPlaceListResponse',{
        publicRoute:true,parameters:[...paging,householdParam,{ name:'locality',in:'query',schema:text(200) },{ name:'q',in:'query',schema:text(100) }],
        description:'Only the approved published PLACE and HOUSEHOLD revisions are returned. Both roots must be visible, not archived; household approved, owner ACTIVE/HOUSEHOLD; place AVAILABLE. q searches the published title/address, treats %, _ and ! literally, and never searches drafts. Public data excludes account IDs, email, audit and review notes.',
      }) },
      '/api/v1/public/places/{placeId}':{ get:operation('getPublicPlace','Chi tiết điểm phục vụ công khai','PublicPlaceResponse',{ publicRoute:true,parameters:[param('placeId')],description:'An unpublished, hidden, paused, retired, archived or inaccessible place returns the same 404 as a missing ID. No authentication required; Cache-Control: no-store.' }) },
      [owner]:{
        get:operation('getOwnedPlaces','HOUSEHOLD: danh sách điểm phục vụ của mình','OwnedPlaceListResponse',{ parameters:paging }),
        post:operation('createPlace','HOUSEHOLD: tạo điểm phục vụ và bản nháp đầu tiên','OwnedPlaceResponse',{ body:'PlaceDraftRequest',status:201,description:'Requires an approved household and live ownership. The server assigns household/code/state. Only a title is needed for DRAFT; nothing becomes public until review. Each successful create creates a separate place.' }),
      },
      [`${owner}/{placeId}`]:{ get:operation('getOwnedPlace','Xem điểm phục vụ, bản mới nhất và bản công khai','OwnedPlaceResponse',{ parameters:[param('placeId')],description:'Active HOUSEHOLD accounts may read their own history after approval revocation. Missing and foreign-household objects both return 403.' }) },
      [`${owner}/{placeId}/profile`]:{ put:operation('savePlaceProfile','Lưu bản nháp mới; giữ nguyên bản công khai','OwnedPlaceResponse',{ body:'PlaceSaveRequest',parameters:[param('placeId')],description:'Requires approved household. Exact latest revisionId/version prevents lost updates. Every save creates the next DRAFT. Pending, retired or archived objects cannot be edited; stale input returns 409.' }) },
      [`${owner}/{placeId}/submissions`]:{ post:operation('submitPlace','Gửi phiên bản điểm phục vụ để Admin duyệt','PlaceChangeResponse',{ body:'HouseholdRevisionReference',parameters:[param('placeId')],description:'Requires approved household, title >=3, body >=20, address >=5 and locality >=2 characters. Coordinates, directions and contact phone are optional. Repeating the same pending submission returns changed=false; rejected revisions need a new draft before resubmission.' }) },
      [`${owner}/{placeId}/revisions`]:{ get:operation('getPlaceRevisions','Lịch sử phiên bản điểm phục vụ của hộ','PlaceRevisionListResponse',{ parameters:[param('placeId'),...paging] }) },
      [`${owner}/{placeId}/status`]:{ patch:operation('setPlaceStatus','Ẩn, tạm ngừng hoặc ngừng hẳn điểm phục vụ','PlaceChangeResponse',{ body:'PlaceStatusRequest',parameters:[param('placeId')],description:'Reason and exact expectedState are mandatory. Stale state returns 409; unchanged state is a no-op. RETIRED cannot be reopened. Revoked/unapproved households may only set non-AVAILABLE and HIDDEN. Never deletes places or changes existing booking commitments. This status is not a resource calendar block.' }) },
      [adminCategory]:{
        get:operation('getAdminCategories','ADMIN: danh mục dùng chung, kể cả đã ngừng','CategoryListResponse',{ admin:true,parameters:[...paging,kindParam,{ name:'isActive',in:'query',schema:{ type:'boolean' } }] }),
        post:operation('createCategory','ADMIN: tạo danh mục SERVICE/PRODUCT/CONTENT','CategoryResponse',{ admin:true,body:'CategoryCreateRequest',status:201,description:'Code is trimmed and uppercased. (kind,code) is unique. Category fields are published directly by ADMIN; no household owner or separate content review applies.' }),
      },
      [`${adminCategory}/{categoryId}`]:{
        get:operation('getAdminCategory','ADMIN: chi tiết danh mục','CategoryResponse',{ admin:true,parameters:[param('categoryId')] }),
        patch:operation('updateCategory','ADMIN: đổi tên hoặc bật/tắt danh mục','CategoryChangeResponse',{ admin:true,body:'CategoryUpdateRequest',parameters:[param('categoryId')],description:'kind/code stay immutable to preserve typed references. Requires expectedState (name,isActive) and a reason. No delete. Existing service/product/content references remain intact after deactivation. Audit writes commit atomically.' }),
      },
      [review]:{ get:operation('getPlaceSubmissions','ADMIN: hàng đợi phiên bản điểm phục vụ','PlaceSubmissionListResponse',{ admin:true,parameters:[...paging,statusParam,householdParam] }) },
      [`${review}/{revisionId}`]:{ get:operation('getPlaceSubmission','ADMIN: xem đúng phiên bản đã gửi','OwnedPlaceResponse',{ admin:true,parameters:[param('revisionId')],description:'Draft or wrong content-type revision IDs return 404.' }) },
      [`${review}/{revisionId}/review`]:{ post:operation('reviewPlace','ADMIN: duyệt hoặc từ chối điểm phục vụ','PlaceChangeResponse',{ admin:true,body:'PlaceReviewRequest',parameters:[param('revisionId')],description:'Must match latest pending revision/version. Reject requires a reason. Approve requires active HOUSEHOLD owner, approved household, non-archived and non-retired place. Publication, audit and owner notification commit together. Repeating the same decision/reason by the same reviewer on the latest version is a no-op. Rejected edits keep the previous approved publication. Approval does not automatically enable a hidden/paused place, alter household approval, grant roles or change bookings.' }) },
    },
    schemas:{
      CategoryCreateRequest:{ type:'object',additionalProperties:false,required:['kind','code','name','isActive','reason'],properties:{ kind:kinds,code:{ type:'string',minLength:1,maxLength:50,pattern:'^[A-Za-z][A-Za-z0-9_]*$' },...categoryState.properties,reason:text(2000) } },
      CategoryUpdateRequest:{ type:'object',additionalProperties:false,required:['expectedState','reason'],properties:{ expectedState:categoryState,...categoryState.properties,reason:text(2000) },anyOf:[{ required:['name'] },{ required:['isActive'] }] },
      CategoryResponse:successSchema({ type:'object',additionalProperties:false,required:['category'],properties:{ category } }),
      CategoryChangeResponse:successSchema({ type:'object',additionalProperties:false,required:['category','changed'],properties:{ category,changed:{ type:'boolean' } } }),
      CategoryListResponse:successSchema(page(category)),
      PlaceDraftRequest:{ type:'object',additionalProperties:false,required:['title'],properties:content,example:{ title:'Vườn trải nghiệm Ba Thành',body:'Điểm đón khách tham quan vườn và trải nghiệm thu hoạch trái cây.',details:{ address:'Ấp Bình Hòa, xã An Bình',locality:'Vĩnh Long',coordinates:{ latitude:10.25,longitude:105.97 },directions:'Đi theo đường vào cổng vườn.',contactPhone:'0901234567' } } },
      PlaceSaveRequest:{ type:'object',additionalProperties:false,required:['revisionId','version','title'],properties:{ ...revisionRef,...content } },
      PlaceStatusRequest:{ ...placeState,required:[...placeState.required,'expectedState','reason'],properties:{ ...placeState.properties,expectedState:placeState,reason:text(2000) } },
      PlaceReviewRequest:{ type:'object',additionalProperties:false,required:['version','decision'],properties:{ version,decision:{ type:'string',enum:['APPROVED','REJECTED'] },reason:text(2000) },oneOf:[{ properties:{ decision:{ enum:['APPROVED'] } } },{ required:['reason'],properties:{ decision:{ enum:['REJECTED'] } } }] },
      OwnedPlaceResponse:successSchema(view),
      PlaceChangeResponse:successSchema({ ...view,required:[...view.required,'changed'],properties:{ ...view.properties,changed:{ type:'boolean' } } }),
      OwnedPlaceListResponse:successSchema(page(view)),
      PlaceRevisionListResponse:successSchema(page(profile)),
      PublicPlaceResponse:successSchema({ type:'object',additionalProperties:false,required:['place'],properties:{ place:publicPlace } }),
      PublicPlaceListResponse:successSchema(page(publicPlace)),
      PlaceSubmissionListResponse:successSchema(page({ type:'object',additionalProperties:false,required:['revisionId','placeId','householdId','version','title','status','submittedAt','reviewedAt'],properties:{
        ...revisionRef,placeId:reference('DatabaseId'),householdId:reference('DatabaseId'),title:text(200),status:{ type:'string',enum:['PENDING','APPROVED','REJECTED'] },submittedAt:date,reviewedAt:{ ...date,nullable:true },
      } })),
    },
  };
}
