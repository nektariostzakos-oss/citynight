// Loutraki — reference config for the citynight bulk city import.
//
// Layout every other city should follow:
//   - slug, cityId, name      → matches the `cities` row.
//   - bias                    → Places locationBias circle (≈ city centre,
//                                 radius tuned to catch the actual town).
//   - cityMustMatch           → strings that MUST appear in FB og:title
//                                 (one variant per script).
//   - locales                 → [el, en] minimum; add de/fr/it when content
//                                 is written.
//   - verticals.<v>           → { slug, content[locale], discoveryQueries,
//                                 staticCandidates[], optional overrides }.
//
// To add a new city: copy this file, swap the content + queries, and run:
//   node scripts/seed/cities/run-city.mjs <slug>

// ── Nightlife body copy (el + en) ────────────────────────────────────
const introNightlifeEl = `Το Λουτράκι παίζει διπλό ρόλο. Την ημέρα είναι παραθαλάσσιο θέρετρο για όσους ξεφεύγουν από την Αθήνα — λιγότερο από μία ώρα μέσω Κορίνθου. Το βράδυ μετατρέπεται σε δικό του ξενύχτι: η παραλιακή γεμίζει με μπαρ και καφέ, το καζίνο τραβάει κίνηση από όλη την Πελοπόννησο, και τα beach bars στην παραλία κρατάνε ζωντανό τον ήχο μέχρι αργά.

Δεν ξεγελιόμαστε με κατασκευασμένες κριτικές. Όλα τα τηλέφωνα, οι ώρες και οι διευθύνσεις στις σελίδες των μαγαζιών έρχονται από το Google ή απευθείας από τον ιδιοκτήτη — όχι από εμάς. Αυτός ο οδηγός σου δείχνει *τι έχει* το Λουτράκι· για τα συγκεκριμένα μαγαζιά μπες στις σελίδες τους.

## Τι παίζει στο Λουτράκι το βράδυ

Η νυχτερινή ζωή στο Λουτράκι δεν μοιάζει με Μύκονο ή Αθήνα. Δεν θα βρεις δεκάδες clubs σε στενά — θα βρεις **μια παραλιακή ζώνη** που λειτουργεί σαν ένα μεγάλο, ανοιχτό μπαρ. Το format είναι: ποτό με θέα στον Κορινθιακό, βόλτα στον πεζόδρομο, και αν θες να τραβήξεις τη βραδιά, μετά καζίνο ή beach bar.

Η σαιζόν είναι έντονη από τα τέλη Μαΐου μέχρι τα μέσα Σεπτεμβρίου, με αιχμή τον Ιούλιο και τον Αύγουστο. Εκτός σαιζόν η πόλη ησυχάζει αλλά δεν κλείνει — το καζίνο και αρκετά μπαρ στην παραλιακή δουλεύουν όλο τον χρόνο.

## Η παραλιακή και τα Ποσειδώνια

Ο πεζόδρομος στη λεωφόρο Ποσειδώνος είναι η καρδιά. Εκεί συγκεντρώνονται καφέ, μπαρ και ταβέρνες με τραπεζάκια μπροστά στη θάλασσα. Το κλίμα είναι χαλαρό — οικογένειες νωρίς, παρέες των 20-30 αργότερα, και αρκετοί που έρχονται από Αθήνα για την παρέα και τη θέα, όχι για το χαμό.

## Καζίνο Λουτρακίου

Το Club Hotel Casino Loutraki είναι από τα μεγαλύτερα της Ευρώπης σε επιφάνεια παιχνιδιού, και ο βασικός λόγος που πολύς κόσμος από Αθήνα και Πελοπόννησο επιλέγει το Λουτράκι για βραδινή έξοδο όλο τον χρόνο. Λειτουργεί σε καθημερινή βάση, με αίθουσες παιχνιδιών, εστιατόρια και bars υπό την ίδια στέγη.

Για την ηλικιακή είσοδο και τις ώρες λειτουργίας ισχύει η ελληνική νομοθεσία περί καζίνο. Έλεγξε πάντα τις επίσημες πληροφορίες πριν πας — δεν τις τυπώνουμε εδώ γιατί αλλάζουν.

## Beach bars και θερινό ξενύχτι

Τη σαιζόν η παραλία του Λουτρακίου έχει αρκετά beach bars με ξαπλώστρες, ποτό και μουσική μέχρι το βράδυ. Δεν λειτουργούν σαν clubs με DJ μέχρι το πρωί — το μοτίβο είναι sunset cocktail, lounge ήχος, και μετά συνέχεια στην παραλιακή ή στο καζίνο. Όσοι ψάχνουν πραγματικό club night μέχρι τις 06:00 συνήθως μετακινούνται στην Αθήνα ή στις Αλκυονίδες παραλίες.

## Πώς θα φτάσεις από Αθήνα

- **Με αυτοκίνητο:** Εθνική Οδός Αθηνών-Κορίνθου, έξοδος Λουτράκι αμέσως μετά τη γέφυρα του Ισθμού. Με ομαλή κίνηση μιλάμε για περίπου 1 ώρα από το κέντρο της Αθήνας.
- **Με ΚΤΕΛ:** δρομολόγια από τον σταθμό Κηφισού προς Λουτράκι σε τακτική βάση. Διάρκεια ταξιδιού περίπου 1.5 ώρα.
- **Διανυκτέρευση:** ξενοδοχεία και ενοικιαζόμενα κατά μήκος της παραλιακής. Σε υψηλή σαιζόν κάνε κράτηση νωρίτερα.

Σαββατοκύριακο, ειδικά τα απογεύματα Παρασκευής επιστροφής και τα βράδια Κυριακής, η εθνική κολλάει — υπολόγισέ το.

## Συχνές ερωτήσεις

> **Είναι το Λουτράκι ασφαλές για νυχτερινή έξοδο;**
> Ναι. Είναι μικρή, καλά φωτισμένη παραθαλάσσια πόλη με ενεργή αστυνόμευση γύρω από το καζίνο και την παραλιακή. Όπως κάθε τουριστικός προορισμός, ισχύει η κοινή λογική για τσάντες και κινητά.

> **Έχει club ή μόνο μπαρ;**
> Κυρίως μπαρ, καφέ και beach bars. Το επίπεδο του «club night» είναι χαλαρό — όχι Μύκονος, όχι Γκάζι. Για heavy clubbing οι περισσότεροι κατεβαίνουν Αθήνα.

> **Πρέπει να έχω ταυτότητα για το καζίνο;**
> Ναι. Ισχύει η ελληνική νομοθεσία περί ορίου ηλικίας και ταυτοποίησης. Πάρε ταυτότητα ή διαβατήριο μαζί σου.

> **Πότε είναι η καλύτερη εποχή για να πας;**
> Από μέσα Ιουνίου μέχρι μέσα Σεπτεμβρίου για beach + παραλιακή. Για καζίνο και ήσυχο weekend escape, όλος ο χρόνος δουλεύει.

> **Υπάρχει νυχτερινή συγκοινωνία προς Αθήνα;**
> Πολύ περιορισμένη μετά τα μεσάνυχτα. Αν δεν διανυκτερεύσεις, ή πας με αυτοκίνητο με οδηγό που δεν πίνει, ή κανονίζεις ταξί/μεταφορά.`;

const introNightlifeEn = `Loutraki plays two roles. By day it's the closest proper seaside resort to Athens — under an hour by car via Corinth. By night it runs its own programme: the seafront promenade fills with bars and cafés, the casino pulls people in from across the Peloponnese, and beach bars keep the sound going late into the night.

We don't fake reviews. Every phone number, opening time and address on our venue pages comes from Google or directly from the owner — not from us. This guide tells you *what kind of nightlife Loutraki has*; for specific venues, open their pages.

## What Loutraki nights look like

Loutraki is not Mykonos and it is not Athens. You won't find dozens of clubs packed into narrow streets — you'll find **one long seafront zone** that behaves like a single open-air bar. The formula: drink with a view of the Gulf of Corinth, walk the promenade, and if you want to stretch the night out, move on to the casino or a beach bar.

Peak season runs from late May through mid-September, with July and August at full volume. Out of season the town quiets down but doesn't shut — the casino and several seafront bars stay open year-round.

## The Posidonos seafront strip

Posidonos Avenue is the heart of it. Cafés, bars and tavernas line the promenade with tables right on the sea. The energy is relaxed — families early, twenty- and thirty-somethings later, and a steady flow of Athenians who came down for the company and the view rather than for chaos.

## Casino Loutraki

Club Hotel Casino Loutraki is one of the largest casinos in Europe by gaming floor area, and the single biggest reason people from Athens and the Peloponnese pick Loutraki for a night out year-round. Gaming floors, restaurants and bars all sit under the same roof.

Greek gaming law sets the age requirement and ID rules. Always check the official site for current opening hours and entry policy before you go — we don't print them here because they change.

## Beach bars and the summer late shift

In season the Loutraki beach hosts a string of beach bars with sun-loungers by day and a lounge programme into the night. They don't function as full DJ clubs running until dawn — the pattern is sunset cocktails, an easy soundtrack, then continuing on the promenade or at the casino. Anyone after a true 6am club night usually drives back to Athens or out to the Alkyonides beaches.

## Getting there from Athens

- **By car:** Athens-Corinth national road, exit at Loutraki just after the Corinth Canal bridge. About 1 hour from central Athens in normal traffic.
- **By bus:** KTEL runs regular services from the Kifisos terminal in Athens. Journey time around 1.5 hours.
- **Where to stay:** hotels and short-term rentals line the seafront. In peak season, book ahead.

Friday evening outbound and Sunday night inbound traffic both get heavy — budget extra time.

## FAQ

> **Is Loutraki safe for a night out?**
> Yes. It's a small, well-lit seaside town with a visible police presence around the casino and the promenade. Standard common sense for bags and phones applies, as anywhere touristy.

> **Does Loutraki have clubs or just bars?**
> Mostly bars, cafés and beach bars. The club-night intensity is mellow — this isn't Mykonos or the Athens Gazi district. For heavy clubbing, most people drive back to Athens.

> **Do I need ID for the casino?**
> Yes. Greek law sets the age limit and requires ID. Bring a national ID card or passport.

> **When is the best time to visit?**
> Mid-June through mid-September for beach and seafront life. For casino visits and a quiet weekend escape, any time of year works.

> **Is there late public transport back to Athens?**
> Very limited after midnight. Either stay overnight, drive with a sober driver, or arrange a taxi/transfer in advance.`;

// ── Stay body copy (el + en) ─────────────────────────────────────────
const introStayEl = `Το Λουτράκι δουλεύει σαν προορισμός όλο τον χρόνο και αυτό φαίνεται και στο πού μπορεί να μείνεις. Δίπλα στην παραλιακή θα βρεις παραθαλάσσια ξενοδοχεία με θέα τον Κορινθιακό, λίγο πιο μέσα τα ιστορικά spa hotels που εκμεταλλεύονται τα φυσικά θερμά νερά, και γύρω από το καζίνο τις μεγάλες resort-style μονάδες με πολλές υπηρεσίες κάτω από μία στέγη.

Αυτός ο οδηγός σου δείχνει σε ποια ζώνη της πόλης να ψάξεις ανάλογα με τι θες — beach + ξενύχτι, χαλάρωση σε spa, ή ένα family resort για Σαββατοκύριακο μακριά από την Αθήνα. Όλα τα ξενοδοχεία στις κάρτες παρακάτω είναι επαληθευμένα μέσω της σελίδας τους στο Facebook και η διεύθυνσή τους έρχεται από το Google.

## Σε ποια περιοχή να μείνεις

Το Λουτράκι είναι μικρό — από άκρη σε άκρη με τα πόδια — οπότε δεν χάνεις απόσταση όποια ζώνη και να διαλέξεις. Παρόλα αυτά, κάθε ζώνη έχει διαφορετική αίσθηση:

- **Παραλιακή (Ποσειδώνος)** — αν θες να βγαίνεις στα μπαρ και τα beach bars χωρίς αυτοκίνητο. Πιο ζωντανή το βράδυ, με θόρυβο τη σαιζόν.
- **Κοντά στο καζίνο** — αν θες να συνδυάζεις διανυκτέρευση και βραδινή έξοδο στο καζίνο χωρίς μεταφορά.
- **Spa / θερμά λουτρά** — αν έρχεσαι για χαλάρωση. Πιο ήσυχη ζώνη, ιδανική όλο τον χρόνο.

## Παραθαλάσσια ξενοδοχεία

Τα ξενοδοχεία πάνω στην παραλιακή σου δίνουν θέα στον Κορινθιακό, άμεση πρόσβαση στην παραλία και στις ταβέρνες, και το ξενύχτι του Λουτρακίου ακριβώς κάτω από το μπαλκόνι σου. Καλή επιλογή για Σαββατοκύριακα τη σαιζόν.

## Spa και θερμά λουτρά

Το όνομα της πόλης σημαίνει κυριολεκτικά «λουτρά» — τα θερμά μεταλλικά νερά του Λουτρακίου είναι γνωστά εδώ και αιώνες για θεραπευτικές χρήσεις. Τα κλασικά spa hotels εκμεταλλεύονται αυτό το νερό σε πισίνες και θεραπείες. Αν έρχεσαι ειδικά για wellness, εδώ θες να μείνεις.

## Πώς θα φτάσεις από Αθήνα

- **Με αυτοκίνητο:** Εθνική Αθηνών-Κορίνθου, έξοδος Λουτράκι μετά τη γέφυρα του Ισθμού. Περίπου 1 ώρα από το κέντρο της Αθήνας σε ομαλή κίνηση. Όλα σχεδόν τα ξενοδοχεία έχουν parking.
- **Με ΚΤΕΛ:** δρομολόγια από σταθμό Κηφισού προς Λουτράκι σε τακτική βάση. Διάρκεια περίπου 1.5 ώρα.
- **Από αεροδρόμιο (ATH):** ~100 λεπτά με αυτοκίνητο μέσω Αττικής Οδού και Εθνικής. Πολλά ξενοδοχεία προσφέρουν shuttle ή κανονίζουν transfer.

## Συχνές ερωτήσεις

> **Πότε είναι η καλύτερη εποχή να μείνω;**
> Για beach + παραλιακή ζωή, Ιούνιος-Σεπτέμβριος. Για spa και ησυχία, όλο τον χρόνο — και μάλιστα Φθινόπωρο/Άνοιξη είναι ιδανικά γιατί τα ξενοδοχεία έχουν χαμηλότερες τιμές και ο καιρός είναι ακόμα ζεστός.

> **Έχει family-friendly resorts;**
> Ναι, αρκετά. Τα μεγάλα παραλιακά resorts και αρκετά spa hotels έχουν πισίνες, οικογενειακά δωμάτια και παιδικά προγράμματα τη σαιζόν.

> **Τι κόστος έχει η διαμονή;**
> Δεν δίνουμε ενδεικτικές τιμές γιατί αλλάζουν δραστικά μεταξύ σαιζόν, μέρας της εβδομάδας και τύπου δωματίου. Δες τη σελίδα του ξενοδοχείου για κρατήσεις και τρέχουσες τιμές.

> **Χρειάζομαι αυτοκίνητο όταν μένω εκεί;**
> Όχι αν μένεις στην παραλιακή — όλα είναι κοντά με τα πόδια. Αν μένεις σε ξενοδοχείο πιο μέσα ή θες να εξερευνήσεις την περιοχή (Αρχαία Κόρινθος, Ηραίο, λίμνη Βουλιαγμένης), το αυτοκίνητο βοηθάει.

> **Λειτουργούν τα ξενοδοχεία όλο τον χρόνο;**
> Τα περισσότερα ναι, ειδικά τα spa hotels και τα casino-area resorts. Τα μικρότερα boutique στην παραλία μπορεί να μειώσουν λειτουργία τον χειμώνα. Έλεγξε τη σελίδα του ξενοδοχείου.`;

const introStayEn = `Loutraki works year-round as a destination, and that shows in where you can stay. Right along the seafront promenade you have beachfront hotels with Gulf-of-Corinth views, set slightly back are the historic spa hotels built around the town's natural thermal springs, and around the casino you'll find resort-style hotels with everything under one roof.

This guide tells you which zone of the town to look in depending on what you want — beach + nightlife, spa-driven relaxation, or a family resort for a weekend away from Athens. Every hotel card below is verified via its Facebook page, with the address pulled directly from Google.

## Which area to stay in

Loutraki is small — you can walk from edge to edge — so no zone is "out of the way". But each has a different feel:

- **Seafront (Posidonos)** — for walking out to the bars and beach bars without a car. More alive at night; some noise in peak season.
- **Near the casino** — for combining your stay with casino visits, no transfer needed.
- **Spa / thermal area** — quieter, ideal for wellness-focused stays year-round.

## Beachfront hotels

Hotels on the Posidonos promenade give you Gulf views, direct beach access, and Loutraki's nightlife scene right under your balcony. Strong choice for in-season weekends.

## Spa and thermal baths

The town's name literally means "baths" — Loutraki's mineral thermal waters have been known for therapeutic use for centuries. The classic spa hotels use this water in pools and treatments. If you're coming specifically for wellness, this is where to stay.

## Getting there from Athens

- **By car:** Athens-Corinth motorway, Loutraki exit after the Corinth Canal bridge. About 1 hour from central Athens in normal traffic. Almost every hotel has parking.
- **By bus:** KTEL services from Kifisos terminal in Athens to Loutraki on a regular schedule. Journey time around 1.5 hours.
- **From the airport (ATH):** ~100 minutes by car via Attiki Odos and the national road. Many hotels offer shuttle service or arrange a transfer.

## FAQ

> **When is the best time to stay?**
> For beach + seafront life, June through September. For spa and quiet, year-round — and shoulder seasons (autumn/spring) are particularly good because rates are lower and the weather is still warm.

> **Are there family-friendly resorts?**
> Yes, several. The bigger beachfront resorts and some spa hotels have pools, family rooms, and kids' programmes in season.

> **What does a stay cost?**
> We don't publish indicative rates because they swing dramatically by season, day of the week, and room type. Check the hotel's own page for current pricing and reservations.

> **Do I need a car when I'm there?**
> Not if you stay on the seafront — everything is walkable. If you stay further back or want to explore the area (Ancient Corinth, the Heraion, Vouliagmeni Lake), a car helps.

> **Are hotels open year-round?**
> Most yes, especially the spa hotels and casino-area resorts. Smaller seafront boutique places may reduce operations in winter — check the hotel's own page.`;

// ── Food body copy (el + en) ─────────────────────────────────────────
const introFoodEl = `Το Λουτράκι τρώει στη θάλασσα. Σχεδόν κάθε ταβέρνα έχει τραπεζάκια με θέα τον Κορινθιακό, και το μενού της πόλης γυρίζει γύρω από τρία πράγματα: φρέσκο ψάρι από τον κόλπο, κλασική παραθαλάσσια ταβέρνα και μερικά πιο σύγχρονα bistro που κρατάνε ζωντανή την παραλιακή το βράδυ.

Δεν φτιάχνουμε top λίστες με βάση το γούστο μας. Όλες οι κάρτες παρακάτω έχουν περάσει διπλό έλεγχο: η διεύθυνση και το τηλέφωνο από το Google, και η σελίδα τους στο Facebook έχει επιβεβαιωθεί ότι λειτουργεί. Αν ένα μαγαζί δεν έχει πρόσφατες κριτικές (τους τελευταίους 6 μήνες), δεν μπαίνει.

## Φαγητό στο Λουτράκι — τι να περιμένεις

Η πόλη δουλεύει με δύο ταχύτητες. Μεσημέρι και Σαββατοκύριακο πέφτει η κίνηση από Αθήνα — οι παραθαλάσσιες ταβέρνες γεμίζουν, η ψαροφαγία είναι ο λόγος που πολλοί κάνουν τη διαδρομή. Καθημερινές βράδυ είναι πιο ήσυχα και πιο φιλικά στο πορτοφόλι, χωρίς να μειώνεται η ποιότητα.

Τιμές: στα σταθερά παραλιακά τραπεζάκια θα δεις τιμές λίγο πάνω από Κόρινθο, χαμηλότερα από Μύκονο. Το ψάρι κοστολογείται με το κιλό και πάει με τη σαιζόν — ρώτα πριν παραγγείλεις.

## Παραθαλάσσιες ταβέρνες

Η Ποσειδώνος είναι γεμάτη ταβέρνες με τραπεζάκια έξω και μενού που κινείται στη γνωστή ελληνική γκάμα: σαλάτες, μεζέδες, κρεατικά, ψάρι. Είναι ο πιο σίγουρος τρόπος να πιάσεις την αίσθηση της πόλης — φαγητό με θέα στη θάλασσα και χαλαρό ρυθμό.

## Ψάρι και θαλασσινά

Ο Κορινθιακός βγάζει ντόπιο ψάρι και αρκετές ψαροταβέρνες του Λουτρακίου το προμηθεύονται απευθείας. Δοκίμασε ό,τι είναι φρέσκο της ημέρας — οι σερβιτόροι θα σου το δείξουν στον πάγο. Συνήθης συνταγή: ψάρι στα κάρβουνα, λαδολέμονο, οριακά πατάτες και κρασί.

## Bistro και μοντέρνα κουζίνα

Όλο και περισσότερα μαγαζιά στο Λουτράκι ξεφεύγουν από το κλασικό ταβέρνα-format. Bistro με μικρές πιατέλες, νέοι σεφ που δουλεύουν τοπικά υλικά με σύγχρονη παρουσίαση, μικρές μπυραρίες με ξεχωριστές λίστες. Αν έχεις φάει ήδη την κλασική παραλιακή και θες κάτι διαφορετικό, ψάξε αυτή την κατηγορία.

## Πώς θα φτάσεις από Αθήνα

- **Με αυτοκίνητο:** Εθνική Αθηνών-Κορίνθου, έξοδος Λουτράκι μετά τη γέφυρα του Ισθμού. Περίπου 1 ώρα από το κέντρο της Αθήνας σε ομαλή κίνηση.
- **Με ΚΤΕΛ:** δρομολόγια από σταθμό Κηφισού. Διάρκεια περίπου 1.5 ώρα.
- Σαββατοκύριακο μεσημέρι κάνε κράτηση στις παραλιακές ταβέρνες — γεμίζουν.

## Συχνές ερωτήσεις

> **Είναι το ψάρι γνήσιο ντόπιο;**
> Εξαρτάται από το μαγαζί και τη μέρα. Οι σοβαρές ψαροταβέρνες δείχνουν το ψάρι πριν το ζυγίσουν και είναι ξεκάθαρες για το αν είναι ντόπιο ή κατεψυγμένο. Ρώτα — όσοι αξίζουν, απαντούν.

> **Ποια είναι η καλύτερη ώρα για φαγητό;**
> Παραλιακές ταβέρνες δουλεύουν από νωρίς το μεσημέρι μέχρι μετά τα μεσάνυχτα στη σαιζόν. Πιο χαλαρά στις 15:00 και μετά τις 22:30. Για ηλιοβασίλεμα με κρασί, στόχευσε 20:00-21:30.

> **Δέχονται κάρτες;**
> Σχεδόν παντού πια, ναι. Αλλά πάρε λίγα μετρητά για beach bars και μικρότερα ψητοπωλεία που μπορεί να έχουν minimum.

> **Είναι κατάλληλα για οικογένειες με παιδιά;**
> Ναι, ιδιαίτερα οι παραλιακές ταβέρνες έχουν χώρο και παιδικές μερίδες. Τα bistro είναι πιο κατάλληλα για ζευγάρια ή παρέες ενηλίκων.

> **Έχει vegan/vegetarian επιλογές;**
> Σταθερά: μεζέδες (σαλάτες, ντολμάδες, μελιτζανοσαλάτα, χόρτα), αλλά καθαρά vegan menu σπανίζει. Τα νεότερα bistro έχουν περισσότερες επιλογές — έλεγξε τη σελίδα τους πριν πας.`;

const introFoodEn = `Loutraki eats by the water. Almost every taverna has tables looking out at the Gulf of Corinth, and the town's menu rotates around three things: fresh fish from the gulf, classic seaside taverna cooking, and a small modern bistro scene that keeps the promenade alive into the night.

We don't build top-of lists from our own taste. Every card below has cleared two checks: address and phone pulled from Google, and the venue's Facebook page verified live. If a place hasn't had a recent review in the last six months, it's not here.

## Eating in Loutraki — what to expect

The town runs at two speeds. Lunchtime and weekends pick up traffic from Athens — the seafront tavernas fill up, and the fish lunch is the reason a lot of people drive down. Weekday evenings are quieter and friendlier on the wallet without sacrificing quality.

Prices: seafront tables run a touch above Corinth, well below Mykonos. Fish is sold by the kilo and moves with the season — always ask before ordering.

## Seafront tavernas

Posidonos is lined with tavernas, tables out front and menus that hit the familiar Greek register: salads, mezze, grilled meats, fish. It's the most reliable way to feel the town — food with a view, no rush.

## Fish and seafood

The Gulf of Corinth still produces a local catch, and several Loutraki fish tavernas source directly. Ask for what's fresh that day — the staff will show you what's on ice. The default treatment: charcoal-grilled, lemon-and-oil dressing, some potatoes and a glass of white.

## Bistro and modern cooking

A growing number of Loutraki kitchens are moving off the classic taverna format. Bistros with small-plate menus, younger chefs working local produce with modern plating, small craft-beer spots with their own lists. If you've already had the classic seafront night and want something different, this is the section.

## Getting there from Athens

- **By car:** Athens-Corinth national road, exit at Loutraki just past the Corinth Canal bridge. About 1 hour from central Athens in normal traffic.
- **By bus:** KTEL services from Kifisos terminal. Journey time around 1.5 hours.
- On weekend lunches, reserve at the seafront tavernas — they fill up fast.

## FAQ

> **Is the fish really local?**
> Depends on the place and the day. Serious fish tavernas will show you the fish before it gets weighed and are clear about local vs frozen. Ask — the ones worth it will answer.

> **What's the best time to eat?**
> Seafront tavernas run from lunchtime well past midnight in season. Quieter around 3pm and after 10:30pm. For a sunset glass of wine, aim for 8-9:30pm.

> **Do they take cards?**
> Almost everywhere now, yes. But keep some cash for beach bars and smaller grills that may have minimums.

> **Is it family-friendly?**
> Yes, especially the seafront tavernas — space, kids' portions, no fuss. The bistros suit couples and adult groups more.

> **Are there vegan/vegetarian options?**
> Reliably: mezze (salads, dolmades, eggplant salad, wild greens), but a dedicated vegan menu is rare. The newer bistros have more on offer — check their pages first.`;

// ── Config ────────────────────────────────────────────────────────────
export default {
  slug: 'loutraki',
  cityId: 'city_loutraki',
  name: 'Λουτράκι',
  cityHint: 'coastal town one hour from Athens, known for casino + seafront promenade + thermal springs',
  bias: { circle: { center: { latitude: 38.018, longitude: 22.976 }, radius: 2000 } },
  cityMustMatch: ['Loutraki', 'Λουτρακι', 'Λουτράκι'],
  // Loutraki-Perachora municipality postal code. Catches venues in
  // Pefkaki, Skaloma, Iras etc. (all 203 00) while excluding neighbouring
  // towns like Vrachati (200 06) that the Places locationBias circle
  // accidentally sweeps in.
  postalCodes: ['203 00', '20300'],
  locales: ['el', 'en'],

  verticals: {
    nightlife: {
      slug: 'nightlife-in-loutraki',
      content: {
        el: {
          title: 'Νυχτερινή ζωή στο Λουτράκι — ο πλήρης οδηγός',
          subtitle: 'Καζίνο, παραλιακή στα Ποσειδώνια και beach bars — μια ώρα από την Αθήνα. Ο οδηγός που δεν φοβάται να σου πει τι ισχύει.',
          tagline: 'Το ξενύχτι μια ώρα απ\' την Αθήνα — καζίνο, παραλιακή, beach bars.',
          knownFor: ['Καζίνο', 'Παραλιακή', 'Beach bars', 'Weekend escape'],
          bestMonths: [6, 7, 8, 9],
          typicalVisitLength: 'weekend',
          intro: introNightlifeEl,
        },
        en: {
          title: 'Nightlife in Loutraki — the honest guide',
          subtitle: 'Casino, the Posidonos seafront strip and beach bars — a real guide to going out in Loutraki, under an hour from Athens.',
          tagline: 'After-dark life an hour from Athens — casino, seafront, beach bars.',
          knownFor: ['Casino', 'Seafront strip', 'Beach bars', 'Weekend escape'],
          bestMonths: [6, 7, 8, 9],
          typicalVisitLength: 'weekend',
          intro: introNightlifeEn,
        },
      },
      discoveryQueries: [
        'rooftop bar Loutraki',
        'cocktail bar Loutraki',
        'beach bar Loutraki',
        'pub Loutraki',
        'live music Loutraki',
        'night club Loutraki',
        'cafe bar Loutraki',
        'wine bar Loutraki',
      ],
      minReviews: 50,
      fbSuffixes: ['loutraki'],
      staticCandidates: [
        {
          key: 'el-nino',
          placesQuery: 'El Niño cafe bar Loutraki',
          placesNameMatch: 'el niño',
          sectionKind: 'seafront',
          fbCandidates: [
            'https://www.facebook.com/p/El-Niño-Cafe-Bar-100027918355022/',
            'https://www.facebook.com/100027918355022',
          ],
          blurb: {
            el: 'Cafe-bar πάνω στην παραλιακή — από τα σημεία απ\' όπου ξεκινάει σχεδόν κάθε βράδυ στο Λουτράκι. Καφές την ημέρα, ποτό το βράδυ, με θέα στον Κορινθιακό.',
            en: 'Cafe-bar right on the seafront promenade — one of the spots where almost every Loutraki night begins. Coffee by day, drinks by night, view of the Gulf of Corinth.',
          },
        },
        {
          key: 'casino',
          placesQuery: 'Club Hotel Casino Loutraki',
          placesNameMatch: 'casino loutraki',
          sectionKind: 'casino',
          fbCandidates: [
            'https://www.facebook.com/clubhotelloutraki.gr/',
            'https://www.facebook.com/pages/Club-Hotel-Casino-Loutraki/141187689282078/',
          ],
          blurb: {
            el: 'Από τα μεγαλύτερα καζίνο της Ευρώπης σε επιφάνεια παιχνιδιού — αίθουσες, εστιατόρια και bars υπό την ίδια στέγη. Δουλεύει όλο τον χρόνο.',
            en: 'One of the largest casinos in Europe by gaming floor area — gaming rooms, restaurants and bars under one roof. Open year-round.',
          },
        },
      ],
    },

    food: {
      slug: 'food-in-loutraki',
      content: {
        el: {
          title: 'Φαγητό στο Λουτράκι — ο πλήρης οδηγός',
          subtitle: 'Ψαροταβέρνες, παραλιακές ταβέρνες και μοντέρνα bistro — επαληθευμένες κάρτες, όχι top λίστες.',
          tagline: 'Φαγητό με θέα τον Κορινθιακό — ψάρι, ταβέρνα, μοντέρνα κουζίνα.',
          knownFor: ['Φρέσκο ψάρι', 'Παραθαλάσσιες ταβέρνες', 'Μοντέρνα bistro', 'Mediterranean'],
          bestMonths: [5, 6, 7, 8, 9, 10],
          typicalVisitLength: 'weekend',
          intro: introFoodEl,
        },
        en: {
          title: 'Food in Loutraki — the honest guide',
          subtitle: 'Fish tavernas, seafront tables and a small modern-bistro scene — verified venues, not top lists.',
          tagline: 'Eating by the Gulf of Corinth — fish, taverna, modern kitchens.',
          knownFor: ['Fresh fish', 'Seafront tavernas', 'Modern bistros', 'Mediterranean'],
          bestMonths: [5, 6, 7, 8, 9, 10],
          typicalVisitLength: 'weekend',
          intro: introFoodEn,
        },
      },
      discoveryQueries: [
        'fish taverna Loutraki',
        'seafood restaurant Loutraki',
        'ψαροταβέρνα Λουτράκι',
        'taverna Loutraki seafront',
        'restaurant Loutraki',
        'bistro Loutraki',
        'grill Loutraki',
        'ταβέρνα Λουτράκι',
        'best restaurant Loutraki',
      ],
      minReviews: 50,
      fbSuffixes: ['loutraki'],
      staticCandidates: [],
    },

    stay: {
      slug: 'stay-in-loutraki',
      content: {
        el: {
          title: 'Διαμονή στο Λουτράκι — ο πλήρης οδηγός',
          subtitle: 'Παραθαλάσσια ξενοδοχεία, spa hotels, family resorts — όλο τον χρόνο, μια ώρα από την Αθήνα.',
          tagline: 'Θερμά λουτρά, παραθαλάσσια ξενοδοχεία, καζίνο — όλο τον χρόνο.',
          knownFor: ['Θερμά λουτρά', 'Spa hotels', 'Παραθαλάσσια resorts', 'Year-round'],
          bestMonths: [4, 5, 6, 7, 8, 9, 10, 11],
          typicalVisitLength: 'weekend',
          intro: introStayEl,
        },
        en: {
          title: 'Stay in Loutraki — the honest guide',
          subtitle: 'Beachfront hotels, spa hotels, family resorts — year-round, an hour from Athens.',
          tagline: 'Thermal baths, beachfront hotels, casino — year-round.',
          knownFor: ['Thermal baths', 'Spa hotels', 'Beachfront resorts', 'Year-round'],
          bestMonths: [4, 5, 6, 7, 8, 9, 10, 11],
          typicalVisitLength: 'weekend',
          intro: introStayEn,
        },
      },
      discoveryQueries: [
        'hotel Loutraki',
        'spa hotel Loutraki',
        'luxury hotel Loutraki',
        'boutique hotel Loutraki',
        'beach hotel Loutraki',
        'thermal spa Loutraki',
        'resort Loutraki',
        'apartments Loutraki',
      ],
      minReviews: 50,
      fbSuffixes: ['hotel', 'loutraki'],
      seafrontNamePattern: /beach|παραλι|seaside|seafront|posidonos|ποσειδων|ammos|αμμος|mantas|καζινο/,
      staticCandidates: [
        {
          key: 'loutraki-thermal-spa',
          placesQuery: 'Loutraki Thermal Spa',
          placesNameMatch: 'thermal',
          sectionKind: 'spa',
          fbCandidates: [
            'https://www.facebook.com/loutraki.spa/',
            'https://www.facebook.com/257179677633902',
          ],
          blurb: {
            el: 'Το ιστορικό spa center του Λουτρακίου με τα φυσικά θερμά μεταλλικά νερά — γνωστά για θεραπευτικές χρήσεις από την αρχαιότητα. Πισίνες, χαμάμ, θεραπείες υπό μια στέγη.',
            en: 'The historic Loutraki spa centre, fed by natural thermal mineral springs known for therapeutic use since antiquity. Pools, hammam, treatments under one roof.',
          },
        },
        {
          key: 'mantas-seaside',
          placesQuery: 'Mantas Seaside Loutraki',
          placesNameMatch: 'mantas',
          sectionKind: 'seafront',
          fbCandidates: [
            'https://www.facebook.com/hotelseasideloutraki/',
            'https://www.facebook.com/MantasHotel/',
          ],
          blurb: {
            el: 'Boutique seaside ξενοδοχείο στην παραλιακή του Λουτρακίου — δωμάτια μπροστά στη θάλασσα και πέντε λεπτά με τα πόδια από το ξενύχτι της παραλιακής.',
            en: 'A boutique seaside hotel on the Loutraki promenade — rooms facing the sea and a five-minute walk from the nightlife strip.',
          },
        },
        {
          key: 'club-hotel-loutraki',
          placesQuery: 'Club Hotel Casino Loutraki',
          placesNameMatch: 'casino loutraki',
          sectionKind: 'seafront',
          fbCandidates: [
            'https://www.facebook.com/clubhotelloutraki.gr/',
          ],
          blurb: {
            el: 'Το ξενοδοχείο που μοιράζεται στέγη με το Club Hotel Casino — pool, spa, εστιατόρια και άμεση πρόσβαση στο καζίνο. Δουλεύει όλο τον χρόνο.',
            en: 'The hotel sharing a roof with Club Hotel Casino — pool, spa, restaurants, and direct casino access. Open year-round.',
          },
        },
      ],
    },
  },
};
