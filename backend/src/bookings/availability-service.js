import { AppError } from '../shared/errors.js';
import { approvedOffers, digest } from '../services/models.js';
import { profileInput as roomProfile } from '../rooms/models.js';
import { profileInput as serviceProfile } from '../services/models.js';
import { iso, overlaps, peakQuantity, offerAvailability } from '../calendar/models.js';
import { amount, multiply, hourlyAmount } from './models.js';

const unavailable=()=>{throw new AppError('AVAILABILITY_CONFLICT');};
export function createAvailabilityService(){
  return {
    // Caller holds live owner/account and household locks. All reads of capacity
    // use FOR UPDATE, even if an earlier lookup established a consistent snapshot.
    async quote(tx,household,input,at){
      if(household.approval_status!=='APPROVED'||household.archived_at||household.visibility!=='VISIBLE'||!household.published_revision_id)throw new AppError('HOUSEHOLD_NOT_APPROVED');
      const householdRevision=await tx.revision(household.published_revision_id);
      if(householdRevision?.status!=='APPROVED')unavailable();
      const items=[];
      for(const requested of input.items){
        if(requested.kind==='ROOM'){
          const room=await tx.room(requested.roomId,household.id);
          if(!room||room.archived_at||room.supply_status!=='AVAILABLE'||room.visibility!=='VISIBLE'||!room.published_revision_id)unavailable();
          const revision=await tx.revision(room.published_revision_id);
          if(revision?.status!=='APPROVED'||String(revision.room_id)!==String(room.id))unavailable();
          const profile=roomProfile(revision,room);
          if(!profile.placeId||!await tx.readyPlace(profile.placeId,household.id)||requested.participants>profile.maxGuests)unavailable();
          const startsAt=iso(`${requested.checkInDate}T${profile.checkInTime}:00+07:00`),endsAt=iso(`${requested.checkOutDate}T${profile.checkOutTime}:00+07:00`);
          const window={startsAt,endsAt};
          if(Date.parse(startsAt)<=+at)unavailable();
          const commitments=await tx.liveItems({roomId:room.id}),blocks=await tx.roomBlocks(room.id);
          if([...commitments,...blocks].some(r=>overlaps(window,{startsAt:r.starts_at,endsAt:r.ends_at})))unavailable();
          const nights=(Date.parse(requested.checkOutDate)-Date.parse(requested.checkInDate))/86400000;
          items.push({kind:'ROOM',roomId:String(room.id),serviceId:null,offerId:null,slotId:null,participants:requested.participants,quantity:nights,pricingType:'PER_NIGHT',isExclusive:true,
            checkInDate:requested.checkInDate,checkOutDate:requested.checkOutDate,startsAt,endsAt,unitPriceVnd:Number(room.nightly_price_vnd),baseAmountVnd:multiply(room.nightly_price_vnd,nights),addonsAmountVnd:0,addons:[],
            snapshot:{title:revision.title,revisionId:String(revision.id),profile,householdTitle:householdRevision.title},usages:[]});
        }else{
          const slot=await tx.slot(requested.slotId,household.id);
          if(!slot||slot.archived_at||slot.visibility!=='PUBLIC'||slot.sales_status!=='OPEN'||slot.readiness_status!=='CONFIRMED'||+slot.starts_at<=+at)unavailable();
          const service=await tx.service(slot.service_id,household.id);
          if(!service||service.archived_at||service.supply_status!=='AVAILABLE'||service.visibility!=='VISIBLE'||!service.published_revision_id)unavailable();
          const revision=await tx.revision(service.published_revision_id),category=await tx.category(service.category_id,true);
          if(revision?.status!=='APPROVED'||!category?.is_active||!service.default_place_id||!await tx.readyPlace(service.default_place_id,household.id)||!slot.place_id||!await tx.readyPlace(slot.place_id,household.id))unavailable();
          const offer=approvedOffers(revision,await tx.serviceOffers(service.id)).find(o=>o.id===requested.offerId);
          const slotOffer=(await tx.slotOffers(slot.id)).find(o=>String(o.offer_id)===requested.offerId&&o.is_enabled);
          if(!offer||!slotOffer)unavailable();
          if(offer.pricingType!=='PER_UNIT'&&requested.units!==1)throw new AppError('INVALID_REQUEST');
          const assignments=(await tx.assignments(slot.id)).filter(a=>!a.released_at),rules=await tx.rules(slot.id),booked=await tx.liveItems({slotId:slot.id}),usages=await tx.usages(slot.id);
          if(!offerAvailability(offer,slot,booked,assignments,rules,usages,requested.participants,requested.units).available)unavailable();
          const needed=[];
          for(const assignment of assignments){
            const resource=await tx.resource(assignment.resource_id,household.id);
            const interval={startsAt:new Date(+slot.starts_at-assignment.preparation_minutes*60000),endsAt:new Date(+slot.ends_at+assignment.cleanup_minutes*60000)};
            if(!resource||resource.archived_at||peakQuantity(await tx.resourceIntervals(resource.id),interval)>resource.total_quantity)unavailable();
            const rule=rules.find(r=>String(r.assignment_id)===String(assignment.id)&&String(r.offer_id)===offer.id);
            if(!rule)unavailable();
            // SESSION_SHARED is allocated once for the entire slot, never once per customer.
            if(rule.usage_basis!=='SHARED_ONCE')needed.push({assignmentId:String(assignment.id),quantity:rule.units_required*(rule.usage_basis==='PER_PERSON'?requested.participants:rule.usage_basis==='PER_UNIT'?requested.units:rule.usage_basis==='PER_GROUP'?Math.ceil(requested.participants/rule.max_people_per_unit):1),
              snapshot:{resourceId:String(resource.id),resourceName:resource.name,usageBasis:rule.usage_basis,unitsRequired:rule.units_required,maxPeoplePerUnit:rule.max_people_per_unit}});
          }
          const minutes=(+slot.ends_at-+slot.starts_at)/60000;
          if(offer.pricingType==='PER_HOUR'&&(!Number.isInteger(minutes)||+slot.starts_at%60000||+slot.ends_at%60000))unavailable();
          const quantity=offer.pricingType==='PER_PERSON'?requested.participants:offer.pricingType==='PER_UNIT'?requested.units:offer.pricingType==='PER_HOUR'?Math.round(minutes/60*10000)/10000:1;
          const price=Number(slotOffer.price_override_vnd??offer.unitPriceVnd);
          const addons=requested.addons.map(a=>{
            const approved=offer.addons.find(candidate=>candidate.key===a.key&&candidate.isActive);
            if(!approved||a.quantity>approved.maxQuantity)throw new AppError('INVALID_REQUEST');
            return {key:a.key,name:approved.name,quantity:a.quantity,unit_price_vnd:approved.unitPriceVnd,amount_vnd:multiply(approved.unitPriceVnd,a.quantity)};
          });
          items.push({kind:'SERVICE',roomId:null,serviceId:String(service.id),offerId:offer.id,slotId:String(slot.id),participants:requested.participants,quantity,pricingType:offer.pricingType,isExclusive:offer.participationMode==='EXCLUSIVE',
            checkInDate:null,checkOutDate:null,startsAt:iso(slot.starts_at),endsAt:iso(slot.ends_at),unitPriceVnd:price,baseAmountVnd:offer.pricingType==='PER_HOUR'?hourlyAmount(price,minutes):multiply(price,quantity),
            addonsAmountVnd:amount(addons.reduce((sum,a)=>sum+BigInt(a.amount_vnd),0n)),addons,
            snapshot:{title:revision.title,revisionId:String(revision.id),profile:serviceProfile(revision,service),offer,placeId:String(slot.place_id),householdTitle:householdRevision.title},usages:needed});
        }
      }
      for(const item of items)item.totalVnd=amount(BigInt(item.baseAmountVnd)+BigInt(item.addonsAmountVnd));
      const totalVnd=amount(items.reduce((sum,i)=>sum+BigInt(i.totalVnd),0n));
      const firstStartsAt=items.map(i=>i.startsAt).sort()[0],lastEndsAt=items.map(i=>i.endsAt).sort().at(-1);
      if(Date.parse(lastEndsAt)-Date.parse(firstStartsAt)>366*86400000)throw new AppError('INVALID_REQUEST');
      const data={householdId:String(household.id),householdTitle:householdRevision.title,items,totalVnd,firstStartsAt,lastEndsAt,timeZone:'Asia/Ho_Chi_Minh'};
      return {...data,token:digest(data)};
    },
  };
}
