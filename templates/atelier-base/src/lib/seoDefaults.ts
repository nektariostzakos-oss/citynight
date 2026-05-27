import type { BusinessSettings } from "./settings";

export type SeoBlock = {
  title_en: string;
  title_el: string;
  description_en: string;
  description_el: string;
};

function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

export function seoDefaults(page: string, b: BusinessSettings, industryId: string = "barber"): SeoBlock {
  if (industryId === "aesthetics") return aestheticsSeo(page, b);
  if (industryId === "nail") return nailSeo(page, b);
  if (industryId === "spa") return spaSeo(page, b);
  if (industryId === "yoga") return yogaSeo(page, b);
  if (industryId === "hair") return hairSeo(page, b);
  return barberSeo(page, b);
}

function hairSeo(page: string, b: BusinessSettings): SeoBlock {
  const name = b.name || "Your Salon";
  const city = b.city || "Your City";
  const phone = b.phone || "";
  const addr = [b.streetAddress, b.city].filter(Boolean).join(", ");
  const base: Record<string, SeoBlock> = {
    seo_home: {
      title_en: clip(`${name} — Hair Salon in ${city}`, 60),
      title_el: clip(`${name} — Κομμωτήριο ${city}`, 60),
      description_en: clip(
        `${name} in ${city}: cut, colour, balayage and bridal styling, by appointment in a calm light-filled salon. Consultation always first. Book online.`,
        158
      ),
      description_el: clip(
        `${name} στο ${city}: κούρεμα, βαφή, balayage και νυφικά styling, με ραντεβού σε ένα ήρεμο, φωτεινό κομμωτήριο. Online κρατήσεις.`,
        158
      ),
    },
    seo_services: {
      title_en: clip(`Cut, Colour & Bridal Menu | ${name} ${city}`, 60),
      title_el: clip(`Κούρεμα, Βαφή & Νυφικά | ${name} ${city}`, 60),
      description_en: clip(
        `Full hair menu at ${name}, ${city}. Cut & finish, single-process colour, balayage, bridal styling, Olaplex treatments and free consultation.`,
        158
      ),
      description_el: clip(
        `Πλήρης κατάλογος υπηρεσιών στο ${name}, ${city}. Κούρεμα, βαφή, balayage, νυφικά styling, Olaplex και δωρεάν consultation.`,
        158
      ),
    },
    seo_shop: {
      title_en: clip(`Salon Shelves — ${name} Shop`, 60),
      title_el: clip(`Προϊόντα Κομμωτηρίου — ${name}`, 60),
      description_en: clip(
        `Davines, Olaplex, Wella Professionals and the take-home products we use at the chair. From the shelves of ${name}, ${city}.`,
        158
      ),
      description_el: clip(
        `Davines, Olaplex, Wella Professionals και προϊόντα take-home που χρησιμοποιούμε στην καρέκλα. Από το ${name}, ${city}.`,
        158
      ),
    },
    seo_gallery: {
      title_en: clip(`Lookbook — Cuts & Colour | ${name}`, 60),
      title_el: clip(`Lookbook — Κουρέματα & Βαφές | ${name}`, 60),
      description_en: clip(
        `Recent cuts, balayage, bridal updos and lived-in colour from ${name}, ${city}. Real clients, real light. See the work before you book.`,
        158
      ),
      description_el: clip(
        `Πρόσφατα κουρέματα, balayage και νυφικά updos από το ${name}, ${city}. Αληθινοί πελάτες, αληθινό φως.`,
        158
      ),
    },
    seo_about: {
      title_en: clip(`Meet the Stylists — ${name}, ${city}`, 60),
      title_el: clip(`Οι Κομμωτές — ${name}, ${city}`, 60),
      description_en: clip(
        `The stylists behind ${name} in ${city}. Years of editorial and bridal work, patient consultation, no rush. Book the chair you want.`,
        158
      ),
      description_el: clip(
        `Οι κομμωτές πίσω από το ${name} στο ${city}. Editorial και νυφικά, με υπομονή και χωρίς βιασύνη.`,
        158
      ),
    },
    seo_contact: {
      title_en: clip(`Find the Salon — ${name}, ${city}`, 60),
      title_el: clip(`Βρείτε μας — ${name}, ${city}`, 60),
      description_en: clip(
        `Visit ${name} at ${addr}. Call ${phone} or email ${b.email}. Opening hours, directions and online booking on one page.`,
        158
      ),
      description_el: clip(
        `Επισκεφθείτε το ${name} στο ${addr}. Καλέστε ${phone} ή email ${b.email}.`,
        158
      ),
    },
    seo_book: {
      title_en: clip(`Book a Chair — ${name} ${city}`, 60),
      title_el: clip(`Κρατήστε Καρέκλα — ${name} ${city}`, 60),
      description_en: clip(
        `Book a chair at ${name} in ${city} in under a minute. Pick your service, your stylist and your time. Consultation always free.`,
        158
      ),
      description_el: clip(
        `Κρατήστε καρέκλα στο ${name}, ${city}, σε λιγότερο από ένα λεπτό. Δωρεάν consultation.`,
        158
      ),
    },
  };
  return base[page] ?? { title_en: name, title_el: name, description_en: `${name} in ${city}.`, description_el: `${name} στο ${city}.` };
}

function nailSeo(page: string, b: BusinessSettings): SeoBlock {
  const name = b.name || "Your Studio";
  const city = b.city || "Your City";
  const phone = b.phone || "";
  const addr = [b.streetAddress, b.city].filter(Boolean).join(", ");
  const base: Record<string, SeoBlock> = {
    seo_home: {
      title_en: clip(`${name} — Nail Studio in ${city}`, 60),
      title_el: clip(`${name} — Nail Studio στο ${city}`, 60),
      description_en: clip(
        `${name} in ${city}: gel, BIAB, hand-painted nail art, pedicures and extensions. Book a chair online in under a minute. Call ${phone}.`,
        158
      ),
      description_el: clip(
        `${name} στο ${city}: gel, BIAB, ζωγραφική στο χέρι, pedicures και επεκτάσεις. Online ραντεβού σε ένα λεπτό. Καλέστε ${phone}.`,
        158
      ),
    },
    seo_services: {
      title_en: clip(`Nail Services & Prices | ${name} ${city}`, 60),
      title_el: clip(`Υπηρεσίες Νυχιών & Τιμές | ${name} ${city}`, 60),
      description_en: clip(
        `Full nail menu at ${name}, ${city}. Classic manicure, gel & BIAB, hand-painted art, luxury pedicure, extensions and soak-off.`,
        158
      ),
      description_el: clip(
        `Πλήρης κατάλογος υπηρεσιών στο ${name}, ${city}. Κλασικό μανικιούρ, gel, BIAB, ζωγραφική στο χέρι, pedicure πολυτελείας.`,
        158
      ),
    },
    seo_shop: {
      title_en: clip(`Nail Care Shop — ${name}`, 60),
      title_el: clip(`Προϊόντα Νυχιών — ${name}`, 60),
      description_en: clip(
        `Cuticle oil, base coats, glass files and gift cards from ${name} in ${city}. The shelves we reach for at the desk.`,
        158
      ),
      description_el: clip(
        `Λάδι επωνυχίων, base coats, γυάλινες λίμες και δωροκάρτες από το ${name} στο ${city}.`,
        158
      ),
    },
    seo_gallery: {
      title_en: clip(`Nail Gallery — Recent Sets | ${name}`, 60),
      title_el: clip(`Πρόσφατα Σετ Νυχιών | ${name}`, 60),
      description_en: clip(
        `Glazed nudes, chrome ombre, fine-line art and bridal sets from ${name}, ${city}. See the work before you book.`,
        158
      ),
      description_el: clip(
        `Glazed nude, chrome ombre, λεπτές γραμμές και νυφικά σετ από το ${name}, ${city}.`,
        158
      ),
    },
    seo_about: {
      title_en: clip(`Meet the Artist — ${name}, ${city}`, 60),
      title_el: clip(`Η Καλλιτέχνιδα — ${name}, ${city}`, 60),
      description_en: clip(
        `The nail artist behind ${name} in ${city}. Hand-painted detail, unhurried sets, premium products only.`,
        158
      ),
      description_el: clip(
        `Η nail artist πίσω από το ${name} στο ${city}. Ζωγραφική στο χέρι, premium προϊόντα.`,
        158
      ),
    },
    seo_contact: {
      title_en: clip(`Contact & Directions — ${name}, ${city}`, 60),
      title_el: clip(`Επικοινωνία — ${name}, ${city}`, 60),
      description_en: clip(
        `Visit ${name} at ${addr}. Call ${phone} or email ${b.email}. Opening hours, directions and online booking on one page.`,
        158
      ),
      description_el: clip(
        `Επισκεφθείτε το ${name} στο ${addr}. Καλέστε ${phone} ή email ${b.email}.`,
        158
      ),
    },
    seo_book: {
      title_en: clip(`Book a Nail Appointment — ${name} ${city}`, 60),
      title_el: clip(`Online Ραντεβού — ${name} ${city}`, 60),
      description_en: clip(
        `Book a nail appointment at ${name} in ${city} in under a minute. Pick your service, your artist and your time. Email confirmation included.`,
        158
      ),
      description_el: clip(
        `Κλείστε ραντεβού στο ${name}, ${city}, σε λιγότερο από ένα λεπτό. Email επιβεβαίωσης και υπενθύμιση.`,
        158
      ),
    },
  };
  return base[page] ?? { title_en: name, title_el: name, description_en: `${name} in ${city}.`, description_el: `${name} στο ${city}.` };
}

function spaSeo(page: string, b: BusinessSettings): SeoBlock {
  const name = b.name || "Your Spa";
  const city = b.city || "Your City";
  const phone = b.phone || "";
  const addr = [b.streetAddress, b.city].filter(Boolean).join(", ");
  const base: Record<string, SeoBlock> = {
    seo_home: {
      title_en: clip(`${name} — Day Spa in ${city}`, 60),
      title_el: clip(`${name} — Day Spa στο ${city}`, 60),
      description_en: clip(
        `${name} in ${city}: signature massage, deep tissue, aromatherapy facial, hot stone ritual and body wraps. Book a treatment online in under a minute. Call ${phone}.`,
        158
      ),
      description_el: clip(
        `${name} στο ${city}: signature μασάζ, βαθύ ιστών, αρωματοθεραπεία, hot stone και body wraps. Online ραντεβού σε ένα λεπτό.`,
        158
      ),
    },
    seo_services: {
      title_en: clip(`Spa Treatments & Prices | ${name} ${city}`, 60),
      title_el: clip(`Θεραπείες Spa & Τιμές | ${name} ${city}`, 60),
      description_en: clip(
        `Full treatment menu at ${name}, ${city}. Massage, facials, body rituals, couples retreats and gift vouchers. Honest, fixed prices.`,
        158
      ),
      description_el: clip(
        `Πλήρης κατάλογος θεραπειών στο ${name}, ${city}. Μασάζ, facials, body rituals και πακέτα για ζευγάρια.`,
        158
      ),
    },
    seo_shop: {
      title_en: clip(`Botanical Skincare & Home — ${name} Shop`, 60),
      title_el: clip(`Φυτικές Φροντίδες & Σπίτι — ${name}`, 60),
      description_en: clip(
        `Bath oils, massage candles, pillow mists and gift cards from ${name} in ${city}. Carry the spa home.`,
        158
      ),
      description_el: clip(
        `Έλαια μπάνιου, κεριά μασάζ, sprays μαξιλαριού και δωροκάρτες από το ${name} στο ${city}.`,
        158
      ),
    },
    seo_gallery: {
      title_en: clip(`Inside the Spa — Treatment Rooms | ${name}`, 60),
      title_el: clip(`Μέσα στο Spa | ${name}`, 60),
      description_en: clip(
        `Treatment rooms, the relaxation lounge and quiet corners at ${name}, ${city}. A look around before you book.`,
        158
      ),
      description_el: clip(
        `Αίθουσες θεραπείας, lounge χαλάρωσης και ήσυχες γωνιές στο ${name}, ${city}.`,
        158
      ),
    },
    seo_about: {
      title_en: clip(`Meet the Therapists — ${name}, ${city}`, 60),
      title_el: clip(`Οι Θεραπευτές — ${name}, ${city}`, 60),
      description_en: clip(
        `The therapists behind ${name} in ${city}. Clinical training, unhurried treatments, one guest at a time.`,
        158
      ),
      description_el: clip(
        `Οι θεραπευτές πίσω από το ${name} στο ${city}. Κλινική εκπαίδευση, ήρεμες θεραπείες.`,
        158
      ),
    },
    seo_contact: {
      title_en: clip(`Visit the Spa — ${name}, ${city}`, 60),
      title_el: clip(`Επισκεφθείτε μας — ${name}, ${city}`, 60),
      description_en: clip(
        `Visit ${name} at ${addr}. Call ${phone} or email ${b.email}. Opening hours, directions and online booking on one page.`,
        158
      ),
      description_el: clip(
        `Επισκεφθείτε το ${name} στο ${addr}. Καλέστε ${phone} ή email ${b.email}.`,
        158
      ),
    },
    seo_book: {
      title_en: clip(`Book a Spa Treatment — ${name} ${city}`, 60),
      title_el: clip(`Online Ραντεβού — ${name} ${city}`, 60),
      description_en: clip(
        `Book a treatment at ${name} in ${city} in under a minute. Pick your therapy, your therapist and your time. Email confirmation included.`,
        158
      ),
      description_el: clip(
        `Κλείστε θεραπεία στο ${name}, ${city}, σε λιγότερο από ένα λεπτό.`,
        158
      ),
    },
  };
  return base[page] ?? { title_en: name, title_el: name, description_en: `${name} in ${city}.`, description_el: `${name} στο ${city}.` };
}

function yogaSeo(page: string, b: BusinessSettings): SeoBlock {
  const name = b.name || "Your Studio";
  const city = b.city || "Your City";
  const phone = b.phone || "";
  const addr = [b.streetAddress, b.city].filter(Boolean).join(", ");
  const base: Record<string, SeoBlock> = {
    seo_home: {
      title_en: clip(`${name} — Yoga Studio in ${city}`, 60),
      title_el: clip(`${name} — Yoga Studio στο ${city}`, 60),
      description_en: clip(
        `${name} in ${city}: vinyasa, slow flow, yin & restore, strong flow and a beginners course. Small classes, every body welcome. Book online or drop in.`,
        158
      ),
      description_el: clip(
        `${name} στο ${city}: vinyasa, slow flow, yin & restore και beginners course. Μικρά τμήματα, κάθε σώμα ευπρόσδεκτο. Online κρατήσεις.`,
        158
      ),
    },
    seo_services: {
      title_en: clip(`Class Timetable & Prices | ${name} ${city}`, 60),
      title_el: clip(`Πρόγραμμα Μαθημάτων | ${name} ${city}`, 60),
      description_en: clip(
        `Full class timetable at ${name}, ${city}. Vinyasa, slow flow, yin, strong flow, morning mobility, beginners course. Class packs and memberships available.`,
        158
      ),
      description_el: clip(
        `Πλήρες πρόγραμμα στο ${name}, ${city}. Vinyasa, slow flow, yin, strong flow, morning mobility, beginners. Class packs και συνδρομές.`,
        158
      ),
    },
    seo_shop: {
      title_en: clip(`Mats, Props & Studio — ${name} Shop`, 60),
      title_el: clip(`Στρωματάκια & Props — ${name}`, 60),
      description_en: clip(
        `Cork mats, blocks, straps, eye pillows and gift cards from ${name} in ${city}. The kit we use on the studio floor.`,
        158
      ),
      description_el: clip(
        `Cork στρωματάκια, blocks, ιμάντες, eye pillows και δωροκάρτες από το ${name} στο ${city}.`,
        158
      ),
    },
    seo_gallery: {
      title_en: clip(`Inside the Studio — ${name}, ${city}`, 60),
      title_el: clip(`Μέσα στο Studio — ${name}, ${city}`, 60),
      description_en: clip(
        `The main studio, props, the quiet corner and the garden room at ${name}, ${city}. No mirrors, no competition, just space to breathe.`,
        158
      ),
      description_el: clip(
        `Το κύριο στούντιο, props και ήσυχες γωνιές στο ${name}, ${city}. Χωρίς καθρέφτες, μόνο χώρος να αναπνεύσεις.`,
        158
      ),
    },
    seo_about: {
      title_en: clip(`Meet the Teachers — ${name}, ${city}`, 60),
      title_el: clip(`Οι Δάσκαλοι — ${name}, ${city}`, 60),
      description_en: clip(
        `The teachers behind ${name} in ${city}. 500-hour trained, trauma-informed, every level welcome. Options for every body, every class.`,
        158
      ),
      description_el: clip(
        `Οι δάσκαλοι πίσω από το ${name} στο ${city}. 500 ώρες εκπαίδευσης, κάθε επίπεδο ευπρόσδεκτο.`,
        158
      ),
    },
    seo_contact: {
      title_en: clip(`Visit the Studio — ${name}, ${city}`, 60),
      title_el: clip(`Επισκεφθείτε μας — ${name}, ${city}`, 60),
      description_en: clip(
        `Visit ${name} at ${addr}. Call ${phone} or email ${b.email}. Class timetable, directions and online booking on one page.`,
        158
      ),
      description_el: clip(
        `Επισκεφθείτε το ${name} στο ${addr}. Καλέστε ${phone} ή email ${b.email}.`,
        158
      ),
    },
    seo_book: {
      title_en: clip(`Book a Class — ${name} ${city}`, 60),
      title_el: clip(`Κράτηση Μαθήματος — ${name} ${city}`, 60),
      description_en: clip(
        `Book a yoga class at ${name} in ${city} in under a minute. Pick your style, your teacher and your time. Drop-ins always welcome.`,
        158
      ),
      description_el: clip(
        `Κλείστε μάθημα yoga στο ${name}, ${city}, σε λιγότερο από ένα λεπτό. Drop-ins ευπρόσδεκτοι.`,
        158
      ),
    },
  };
  return base[page] ?? { title_en: name, title_el: name, description_en: `${name} in ${city}.`, description_el: `${name} στο ${city}.` };
}

function aestheticsSeo(page: string, b: BusinessSettings): SeoBlock {
  const name = b.name || "Your Studio";
  const city = b.city || "Your City";
  const phone = b.phone || "";
  const addr = [b.streetAddress, b.city].filter(Boolean).join(", ");

  const base: Record<string, SeoBlock> = {
    seo_home: {
      title_en: clip(`${name} — Aesthetics Studio in ${city}`, 60),
      title_el: clip(`${name} — Aesthetics στο ${city}`, 60),
      description_en: clip(
        `${name} in ${city}: personalised facials, Hydrafacial, microneedling, dermaplaning, and acne clearing. Book online in under a minute. Call ${phone}.`,
        158
      ),
      description_el: clip(
        `${name} στο ${city}: εξατομικευμένα facials, Hydrafacial, microneedling, dermaplaning, και προγράμματα για ακμή. Online ραντεβού σε ένα λεπτό.`,
        158
      ),
    },
    seo_services: {
      title_en: clip(`Facial & Treatment Menu | ${name} ${city}`, 60),
      title_el: clip(`Υπηρεσίες & Τιμές | ${name} ${city}`, 60),
      description_en: clip(
        `Full treatment menu at ${name}, ${city}. Signature facials, Hydrafacial, microneedling, dermaplaning, chemical peels, bridal prep.`,
        158
      ),
      description_el: clip(
        `Πλήρης κατάλογος υπηρεσιών στο ${name}, ${city}. Signature facials, Hydrafacial, microneedling, dermaplaning, peels, νυφικά πακέτα.`,
        158
      ),
    },
    seo_shop: {
      title_en: clip(`Clinical Skincare — ${name} Shop`, 60),
      title_el: clip(`Clinical Skincare — ${name}`, 60),
      description_en: clip(
        `SkinBetter Science, Face Reality, Vivant and other clinical-grade skincare from ${name} in ${city}. The shelves we actually use in treatments.`,
        158
      ),
      description_el: clip(
        `SkinBetter Science, Face Reality, Vivant — τα προϊόντα που χρησιμοποιούμε στο ${name} στο ${city}.`,
        158
      ),
    },
    seo_gallery: {
      title_en: clip(`Results Gallery — Facials & Treatments | ${name}`, 60),
      title_el: clip(`Αποτελέσματα — Facials & Θεραπείες | ${name}`, 60),
      description_en: clip(
        `Real client results from ${name}, ${city}. Before-and-after acne clearing, Hydrafacial, sculpting facials, and bridal prep.`,
        158
      ),
      description_el: clip(
        `Αποτελέσματα πελατών στο ${name}, ${city}. Πριν/μετά ακμή, Hydrafacial, sculpting, νυφικό.`,
        158
      ),
    },
    seo_about: {
      title_en: clip(`Meet the Team — ${name}, ${city}`, 60),
      title_el: clip(`Η Ομάδα — ${name}, ${city}`, 60),
      description_en: clip(
        `The aestheticians behind ${name} in ${city}. Continuing education, clinical expertise, and a restorative spa experience.`,
        158
      ),
      description_el: clip(
        `Οι aestheticians πίσω από το ${name} στο ${city}. Συνεχής εκπαίδευση, κλινική γνώση, χαλαρωτική εμπειρία.`,
        158
      ),
    },
    seo_contact: {
      title_en: clip(`Contact & Directions — ${name}, ${city}`, 60),
      title_el: clip(`Επικοινωνία & Πρόσβαση — ${name}, ${city}`, 60),
      description_en: clip(
        `Visit ${name} at ${addr}. Call ${phone} or email ${b.email}. Opening hours, directions, and online booking on one page.`,
        158
      ),
      description_el: clip(
        `Επισκεφθείτε το ${name} στο ${addr}. Καλέστε ${phone} ή email ${b.email}. Ωράριο, χάρτης και online ραντεβού.`,
        158
      ),
    },
    seo_book: {
      title_en: clip(`Book a Treatment — ${name} ${city}`, 60),
      title_el: clip(`Online Ραντεβού — ${name} ${city}`, 60),
      description_en: clip(
        `Book a treatment at ${name} in ${city} in under a minute. Pick your service, your aesthetician, and your time. Email confirmation + reminder included.`,
        158
      ),
      description_el: clip(
        `Κλείστε θεραπεία στο ${name}, ${city}, σε λιγότερο από ένα λεπτό. Email επιβεβαίωσης και υπενθύμιση.`,
        158
      ),
    },
  };
  return base[page] ?? {
    title_en: name,
    title_el: name,
    description_en: `${name} in ${city}.`,
    description_el: `${name} στο ${city}.`,
  };
}

function barberSeo(page: string, b: BusinessSettings): SeoBlock {
  const name = b.name || "Your Salon";
  const city = b.city || "Your City";
  const phone = b.phone || "";
  const addr = [b.streetAddress, b.city].filter(Boolean).join(", ");

  const base: Record<string, SeoBlock> = {
    seo_home: {
      title_en: clip(`${name} — Barber Shop in ${city}`, 60),
      title_el: clip(`${name} — Κουρείο ${city}`, 60),
      description_en: clip(
        `${name} in ${city}: classic cuts, sharp fades, beard trims, and hot-towel shaves. Walk-ins welcome, online booking in under a minute. Call ${phone}.`,
        158
      ),
      description_el: clip(
        `${name} στο ${city}: κλασικά κουρέματα, fades, περιποίηση γενειάδας και ξυρίσματα με ζεστή πετσέτα. Online ραντεβού σε ένα λεπτό. Καλέστε ${phone}.`,
        158
      ),
    },
    seo_services: {
      title_en: clip(`Haircuts, Beards & Shave Prices | ${name} ${city}`, 60),
      title_el: clip(`Υπηρεσίες & Τιμές | ${name} ${city}`, 60),
      description_en: clip(
        `Full service menu and pricing at ${name}, ${city}. Men's haircuts, fades, beard sculpt, hot-towel shave, full grooming. Book the chair online.`,
        158
      ),
      description_el: clip(
        `Πλήρης κατάλογος υπηρεσιών και τιμών στο ${name}, ${city}. Κουρέματα, fades, περιποίηση γενειάδας, ξύρισμα, full grooming. Κλείστε online.`,
        158
      ),
    },
    seo_shop: {
      title_en: clip(`Grooming Products — ${name} Shop`, 60),
      title_el: clip(`Προϊόντα Περιποίησης — ${name}`, 60),
      description_en: clip(
        `Pomade, beard oil, shampoo, combs, straight razors, and gift vouchers from ${name} in ${city}. Shop the shelves our barbers actually use.`,
        158
      ),
      description_el: clip(
        `Πομάδες, λάδια γενειάδας, σαμπουάν, χτένες, ξυράφια και δωροκάρτες από το ${name} στο ${city}. Τα προϊόντα που χρησιμοποιούμε στην καρέκλα.`,
        158
      ),
    },
    seo_gallery: {
      title_en: clip(`Barber Portfolio — Cuts, Fades & Beards | ${name}`, 60),
      title_el: clip(`Portfolio — Κουρέματα, Fades, Γενειάδες | ${name}`, 60),
      description_en: clip(
        `Fresh work from the chair at ${name}, ${city}. Recent haircuts, fades, beard shapes, and shop moments. See the style before you book.`,
        158
      ),
      description_el: clip(
        `Πρόσφατες δουλειές από την καρέκλα του ${name}, ${city}. Κουρέματα, fades, περιποίηση γενειάδας. Δες το στυλ πριν κλείσεις ραντεβού.`,
        158
      ),
    },
    seo_about: {
      title_en: clip(`Meet the Team — ${name} Barbers, ${city}`, 60),
      title_el: clip(`Η Ομάδα — ${name}, ${city}`, 60),
      description_en: clip(
        `The barbers behind ${name} in ${city}. Years of chair time, classic craft, modern style. Book directly with the barber you want.`,
        158
      ),
      description_el: clip(
        `Οι barbers πίσω από το ${name} στο ${city}. Χρόνια εμπειρίας, κλασική τέχνη, μοντέρνο στυλ. Κλείσε ραντεβού απευθείας με τον barber που θες.`,
        158
      ),
    },
    seo_contact: {
      title_en: clip(`Contact & Directions — ${name}, ${city}`, 60),
      title_el: clip(`Επικοινωνία & Πρόσβαση — ${name}, ${city}`, 60),
      description_en: clip(
        `Visit ${name} at ${addr}. Call ${phone} or email ${b.email}. Opening hours, directions, and online booking on one page.`,
        158
      ),
      description_el: clip(
        `Επισκεφθείτε το ${name} στο ${addr}. Καλέστε ${phone} ή email ${b.email}. Ωράριο, χάρτης και online ραντεβού.`,
        158
      ),
    },
    seo_book: {
      title_en: clip(`Book Online — ${name} ${city}`, 60),
      title_el: clip(`Online Ραντεβού — ${name} ${city}`, 60),
      description_en: clip(
        `Book a chair at ${name} in ${city} in under a minute. Pick your service, your barber, and your time. Email confirmation + reminder included.`,
        158
      ),
      description_el: clip(
        `Κλείστε ραντεβού στο ${name}, ${city}, σε λιγότερο από ένα λεπτό. Υπηρεσία, barber και ώρα της επιλογής σας. Email επιβεβαίωσης και υπενθύμιση.`,
        158
      ),
    },
  };

  return (
    base[page] ?? {
      title_en: name,
      title_el: name,
      description_en: `${name} in ${city}.`,
      description_el: `${name} στο ${city}.`,
    }
  );
}
