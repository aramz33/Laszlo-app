# AR Artwork Scanner for Rijksmuseum in 48 Hours

## Bottom line

For a 48 hour MVP, the strongest path is **React Native with Expo for the app shell, ViroReact for AR image tracking, Supabase for the content and user-answer database, and Rijksmuseum Collection Online plus IIIF images for artwork source material**. That stack keeps your team in a JavaScript and TypeScript workflow, gives you native ARKit support on iOS and ARCore support on Android through one React Native library, and lets you start with a small, curated set of Rijksmuseum artworks that are already exposed through the museum’s open data and collection pages. Rijksmuseum’s current digital platform also points in the same direction conceptually, it now offers Collection Online with linked open data, downloadable images, and even an AI-supported Art Explorer for discovery. [\[1\]](https://reactvision.xyz/viro-react/)

The practical recommendation is to **ship a guided micro-tour, not a universal scanner**. In other words, do not try to recognize the whole museum in this edition. Load only **five to eight public-domain Rijksmuseum works**, grouped by room or gallery, and let the app tell short stories, ask one or two branching questions per piece, store the answers, and recommend the next artwork based on the user’s interests. That is achievable in two days. A full visual-recognition layer for hundreds or thousands of artworks is a later phase. [\[2\]](https://www.rijksmuseum.nl/en/collection/object/The-Night-Watch-Militia-Company-of-District-II-under-the-Command-of-Captain-Frans-Banninck-Cocq--3137deb45cd7765f9a76084a16c99544)

The short answer to your Vivino question is this: **Vivino is not fundamentally an ARKit app**. A published PTC case study says Vivino used **Vuforia Engine** and specifically **Vuforia Cloud Recognition** to recognize wine labels at very large scale, with the image database hosted in the cloud. That is a cross-platform visual-recognition approach, not an ARKit-only strategy. For your Rijksmuseum MVP, that is informative but not the right first implementation. [\[3\]](https://www.ptc.com/en/case-studies/vivino?srsltid=AfmBOopcolulGRsWnKsnU_L7iEg2k3unAsfaEOW4dPqtwIt_AS-_epLJ)

## What Vivino is using and what that means for you

PTC’s Vivino case study states that Vivino used **Vuforia Engine** and **Vuforia Cloud Recognition**, and quotes Vivino’s founder saying they used the cloud recognition service because it was accurate and scalable. The same case study explains that Vuforia stores label images in the cloud and matches incoming scans against that cloud target set, which allowed Vivino to manage millions of image targets without forcing app updates for every new target. [\[3\]](https://www.ptc.com/en/case-studies/vivino?srsltid=AfmBOopcolulGRsWnKsnU_L7iEg2k3unAsfaEOW4dPqtwIt_AS-_epLJ)

That matters because it tells you what problem Vivino was solving. Vivino needed to identify **massive numbers of lookalike labels** across a constantly growing catalog. That is why a cloud-based computer-vision matching system made sense. Your first Rijksmuseum build is different. You do **not** need millions of targets, you need a **small curated set of artworks with strong stories and follow-up recommendations**, inside a single museum, in one hackathon-sized delivery. That means you should prefer **local image-target AR** for the MVP, and only move toward Vuforia-style cloud recognition later if you decide to support a much larger collection or multiple museums. [\[4\]](https://www.ptc.com/en/case-studies/vivino?srsltid=AfmBOopcolulGRsWnKsnU_L7iEg2k3unAsfaEOW4dPqtwIt_AS-_epLJ)

So the direct translation is:

* **Vivino equivalent at scale**: Vuforia-like cloud recognition.
* **Best MVP for you in 48 hours**: local tracked image recognition with React Native, using ViroReact on top of ARKit and ARCore. [\[5\]](https://www.ptc.com/en/case-studies/vivino?srsltid=AfmBOopcolulGRsWnKsnU_L7iEg2k3unAsfaEOW4dPqtwIt_AS-_epLJ)

## The best SDK choice for this project

Why ViroReact is the best primary choice

ViroReact is a React Native AR and VR library that supports **ARKit on iOS** and **ARCore on Android**, and its current documentation says it works with both **React Native CLI and Expo projects**. Its image-recognition docs show exactly the interaction model you need: define reference images as tracking targets, then attach content inside a ViroARImageMarker so that when the app detects the artwork, the overlay stays synchronized with the detected image. It also requires a physicalWidth, which is useful for museum use because you know the real dimensions of the artwork from Rijksmuseum object pages. [\[6\]](https://reactvision.xyz/viro-react/)

That maps almost perfectly to your brief. You want an artwork to be recognized, then a point should appear, then a storyteller should speak, then the user should answer what to explore next. With ViroReact, recognition and anchored overlay are already part of the API surface, and the rest is normal React Native product work. In a 48 hour sprint, this reduction in moving parts is the biggest advantage. [\[7\]](https://viro-community.readme.io/docs/image-recognition)

## Why not ARKit directly

ARKit absolutely supports image detection and tracking, but it is **Apple-only**. Apple’s docs indicate image tracking updates the transform for **up to four** tracked reference images during a session. That is a perfectly fine technical base for iOS, but it does not solve Android, and your project brief already points at a React Native direction rather than separate native apps. [\[8\]](https://developer.apple.com/documentation/arkit/arworldtrackingconfiguration/detectionimages?utm_source=chatgpt.com)

If you were building a polished iPhone-only app for a museum partner, direct ARKit would be defensible. For this build, it creates more work than value.

## Why not Unity AR Foundation for the MVP

Unity AR Foundation is robust and mature for tracked-image experiences. Its documentation shows that image tracking is based on a **reference image library**, that detected images create trackable objects, and that content should be attached to those tracked images. Unity’s ARKit plugin also documents the image import and build workflow for iOS reference images. [\[9\]](https://docs.unity3d.com/Packages/com.unity.xr.arfoundation@4.0/manual/tracked-image-manager.html)

The problem is not capability, it is **time and workflow overhead**. Unity is a stronger choice when the app is primarily a 3D experience, when you already have a Unity team or existing art content, or when you need runtime-modifiable image libraries as you scale. For a museum storytelling app where the hard part is actually **content, state, questions, recommendations, and product flow**, React Native keeps the app faster to assemble. Unity would be my second choice, not my first, for your 48 hour deadline. [\[9\]](https://docs.unity3d.com/Packages/com.unity.xr.arfoundation@4.0/manual/tracked-image-manager.html)

## Why Vuforia is not the first build, but is the future build

Vuforia still matters here because it is the closest public analogue to Vivino’s recognition model. Vuforia’s official docs support Unity development and mobile deployment, and current platform support pages show it still targets modern Android and iOS versions. Vivino’s published implementation also shows why it becomes attractive once you need **cloud-managed recognition at scale**. [\[10\]](https://developer.vuforia.com/library/?utm_source=chatgpt.com)

If this Rijksmuseum prototype becomes a real product and you later want recognition across many rooms, rotating exhibitions, or multiple institutions, Vuforia deserves a serious evaluation. For the hackathon, it is extra setup and risk.

## Why not 8th Wall for this edition

8th Wall is interesting for WebAR and even has example projects for **art gallery image targets**. However, the platform’s own site says the hosted 8th Wall platform was retired on **February 28, 2026**, with the engine and image-target tooling moving into an open model. That makes it less attractive for a rushed museum app build when your brief already assumes an app and not a browser-first experience. [\[11\]](https://8thwall.org/?utm_source=chatgpt.com)

## Where VisionCamera fits

React Native VisionCamera is excellent camera infrastructure. Its docs describe it as a high-performance camera library built on **AVFoundation** and **CameraX**, and it supports real-time frame output to JS worklets. That makes it a strong companion if you later want custom CV, analytics, or fallback capture flows. But it is **not your AR anchor system**. It is the camera pipe, not the museum overlay framework. [\[12\]](https://visioncamera.margelo.com/docs?utm_source=chatgpt.com)

## The recommendation

### Use this stack:

**App shell**: Expo React Native.
**AR layer**: ViroReact.
**Narration**: expo-speech for MVP, prerecorded audio later.
**Database**: Supabase.
**Fallback local cache**: bundled JSON for the demo, sync answers when online.
**Artwork source**: Rijksmuseum Search API and IIIF images. [\[13\]](https://reactvision.xyz/viro-react/)

Rijksmuseum imagery and the artworks you should scan first

Rijksmuseum’s current data services are unusually friendly for a project like this. The museum says it offers metadata for **over 800,000 objects**, high-resolution photographs for hundreds of thousands of collection objects, and multiple access points including APIs and downloads. Its policy says much of the collection website and open data can be reused freely, often under **Public Domain** or **CC0**, while some records may instead carry **CC BY 4.0** or other restrictions, so each object’s rights notice still needs to be checked. The museum also says that most artwork pages offer **free high-resolution JPEG downloads**, averaging around **4500 by 4500 pixels**, and that users should credit **Rijksmuseum, Amsterdam**. [\[14\]](https://data.rijksmuseum.nl/)

For programmatic access, the Rijksmuseum Search API requires **no API key**, and the IIIF Image API supports **cropping, resizing, grayscale conversion, rotation, and format changes** through URL syntax. That is ideal for scanner preparation because ARCore’s image pipeline is feature-based and grayscale-centered, so you can automatically fetch a cropped, normalized candidate image for testing instead of screenshotting the website by hand. [\[15\]](https://data.rijksmuseum.nl/docs/search)

The first edition should focus on artworks that are iconic, flat, on display, public domain, and visually rich enough for feature extraction. ARCore recommends images with sufficient unique features and even provides arcoreimg with a recommended quality score of at least **75**. Apple’s documentation also emphasizes that ARKit reference images need sufficient detail. [\[16\]](https://developers.google.com/ar/develop/augmented-images)

The strongest starter set is this:

**The Night Watch**. It is on display in the **Night Watch Gallery**, is public domain, and the Rijksmuseum page exposes a large amount of story material around the work, including Operation Night Watch research and ultra-high-resolution imagery. It is perfect for hotspot storytelling because the painting itself contains many distinct figures and sub-stories. [\[17\]](https://www.rijksmuseum.nl/en/collection/object/The-Night-Watch-Militia-Company-of-District-II-under-the-Command-of-Captain-Frans-Banninck-Cocq--3137deb45cd7765f9a76084a16c99544)

**The Milkmaid**. It is on display in the **Gallery of Honour**, is public domain, and its object page already foregrounds the qualities that suit a guided looking experience, the stream of milk, stillness, light, and Vermeer’s colored dots. It is also visually compact and iconic, which is good for reliable image tracking. [\[18\]](https://www.rijksmuseum.nl/en/collection/object/Het-melkmeisje--42dd0e658c2979aec8e144d2357c55c0)

**The Threatened Swan**. It is on display in the **Gallery of Honour**, is public domain, and has a direct story bridge from animal drama to Dutch political allegory and the early history of the Rijksmuseum itself. It is also probably your best **first target to implement**, because the white swan against the darker background creates a memorable silhouette while still containing enough texture in wings, beak, water, and background edges for a recognition experiment. [\[19\]](https://www.rijksmuseum.nl/en/collection/object/The-Threatened-Swan--22040f90565e730131983a44a85b989f?tab=data)

This is a good example of the kind of Rijksmuseum image you can use as a first tracked target. [\[19\]](https://www.rijksmuseum.nl/en/collection/object/The-Threatened-Swan--22040f90565e730131983a44a85b989f?tab=data)

**Self-portrait by Vincent van Gogh**. It is on display in **room 1.18**, is public domain, and its rhythmic brushstrokes plus strong face composition make it promising for recognition and excellent for a story branch about self-image, Paris, color, and modernity. [\[20\]](https://www.rijksmuseum.nl/en/collection/object/Self-portrait--72f97ac66c33f86b161cd51d62f7d365)

**The Merry Drinker**. It is on display in the **Gallery of Honour**, is public domain, and has a highly expressive face and brushwork that can connect well to questions about mood, gesture, or character. It is also a good recommendation target if a user enjoyed expressive portraiture rather than narrative group scenes. [\[21\]](https://www.rijksmuseum.nl/en/collection/object/The-Merry-Drinker--884b50ad9157e0b12a90e4a5e8acf336?utm_source=chatgpt.com)

There is an important technical catch. ARKit tracks only **up to four** reference images during a session, while ARCore can track **up to twenty** unique images simultaneously and one active database can hold **up to one thousand** reference images. Because you want one cross-platform experience, the safest design is to keep **small per-room target sets**. For example, activate a Gallery of Honour set, a Night Watch set, and a room 1.18 set, instead of one huge global target library. [\[22\]](https://developer.apple.com/documentation/arkit/arworldtrackingconfiguration/detectionimages?utm_source=chatgpt.com)

The architecture that fits your concept

Your concept has four distinct layers: **recognition**, **storytelling**, **question capture**, and **recommendation**. The cleanest MVP architecture is to treat artwork recognition as a trigger into a graph of linked museum content.

When the camera recognizes an artwork, ViroReact should anchor the scene to that image target. The app then pulls a local or remote artwork\_story object, displays one or more fixed points over the image, starts narration, and presents a lightweight choice such as “Do you want to look closer at the light, the people, the symbolism, or another work like this?” The answer is stored with the session, and each answer maps to one or more interest tags, such as portrait, daily\_life, animals, Amsterdam, politics, brushwork, or light. The next recommendation is just a weighted match against nearby artworks sharing those tags. ViroReact’s image-marker model and Expo’s text-to-speech support this interaction pattern directly. [\[23\]](https://viro-community.readme.io/docs/image-recognition)

For the database, **Supabase** fits better than Firebase for this problem because your content is naturally relational. You have artworks, stories, hotspots, questions, answers, and artwork-to-artwork links. Supabase’s React Native guides cover Expo, auth, database, and storage, and its database model is Postgres with Row Level Security. That gives you a better foundation for content graphs and recommendations than a document-first schema. [\[24\]](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native?utm_source=chatgpt.com)

The one thing Firebase still does better for hackathon convenience is **offline persistence out of the box**. Firestore officially supports offline caching. Supabase’s own Expo docs point to adding an offline-first layer such as WatermelonDB when you need robust local sync. That creates a clear MVP decision: use **Supabase as the source of truth**, but **bundle the selected artworks and stories locally** so the demo does not depend on museum Wi-Fi, then sync user answers when connectivity is available. [\[25\]](https://firebase.google.com/docs/firestore/manage-data/enable-offline?utm_source=chatgpt.com)

A practical schema looks like this:

* artworks, one row per selected Rijksmuseum piece, including object id, title, gallery or room, target image path, physical width, and tags.
* stories, one or more narrated story nodes per artwork.
* hotspots, overlay points anchored in artwork coordinates, each linked to a story node.
* questions, the prompts asked after a story or hotspot.
* answers, the user’s responses with derived interest tags.
* artwork\_links, curated edges such as “same artist”, “same period”, “same theme”, “same emotion”, or “same technique”.
* sessions, the user’s museum journey.

That structure is simple enough to build quickly and flexible enough to evolve later into personalized tours, thematic routes, or cross-museum recommendations.

For the recommendation logic, keep it deliberately simple in the first edition. Do **not** build AI ranking first. Instead, create a weighted score:

score \= shared\_tags \+ same\_gallery\_bonus \+ curator\_priority \+ not\_yet\_seen\_bonus

That lets the app guide a user toward another public-domain piece already in your active set without requiring indoor positioning. In a museum MVP, “Go next to The Merry Drinker in the Gallery of Honour” is strong enough. Full indoor navigation can wait. [\[26\]](https://www.rijksmuseum.nl/en/collection/object/The-Merry-Drinker--884b50ad9157e0b12a90e4a5e8acf336?utm_source=chatgpt.com)

The build plan for the next 48 hours

What you should ship

The deliverable should be a **single polished museum micro-tour** with:

* recognition for **five artworks**,
* one anchored hotspot per artwork at first, two if time allows,
* narration for each piece,
* one user question per artwork,
* stored user answers,
* a final “You may also like these next works” recommendation screen. [\[7\]](https://viro-community.readme.io/docs/image-recognition)

That is enough to demonstrate the idea end to end.

First day

Spend the opening block on **content and target preparation**, not code. Pull the five artwork pages, confirm rights status, download the highest-quality JPEGs from the collection pages, and generate test versions through the IIIF API. Use grayscale crops where appropriate and evaluate each image with ARCore’s arcoreimg, targeting image-quality scores of **75 or above** where possible. Keep a spreadsheet or JSON manifest with title, room, dimensions, rights, target path, and story angle. [\[27\]](https://www.rijksmuseum.nl/en/research/image-requests)

Then set up the app shell: Expo app, navigation, a data module, Supabase project, and the first ViroReact AR screen. Register targets using Viro tracking targets and use the real artwork widths from Rijksmuseum object pages as the physicalWidth. Get a single “anchor found” event working for **The Threatened Swan** first, because it is a good balance of visual distinctiveness and manageable composition. [\[28\]](https://viro-community.readme.io/docs/image-recognition)

By the end of the first day, you want **one artwork fully working** from scan to narration to one stored answer.

Second day

Build outward from the working slice. Add the remaining four artworks. Keep the overlay design extremely restrained: one pulsing point, one card, one narrator voice, one question. Use Expo Speech for the first iteration, because it is already available and avoids audio production overhead. If you have time later, swap individual stories to prerecorded audio files for warmth and consistency. [\[29\]](https://docs.expo.dev/versions/latest/sdk/speech/?utm_source=chatgpt.com)

Next, wire the recommendation logic. Each answer should write one row to answers, add or increment interest tags in local state, then compute two or three recommended next works from your local artwork graph. The output should include the artwork title, the reason, and the display location, such as **Gallery of Honour**, **Night Watch Gallery**, or **1.18**. [\[30\]](https://www.rijksmuseum.nl/en/collection/object/The-Night-Watch-Militia-Company-of-District-II-under-the-Command-of-Captain-Frans-Banninck-Cocq--3137deb45cd7765f9a76084a16c99544)

Use the final hours for failure-proofing. Add a manual fallback button, “Tap to choose artwork”, so the demo still works if recognition struggles under museum-like glare or distance. ARCore notes that initial detection works best when the image fills at least **25 percent of the camera frame**, so your scan UI should explicitly tell users to move closer and hold steady. [\[31\]](https://developers.google.com/ar/develop/augmented-images)

What to cut if time slips

If the schedule starts slipping, cut in this order:

First, cut multiple hotspots per artwork.
 Second, cut remote fetching during the demo and keep content bundled locally.
 Third, cut voice input and keep answer buttons only.
 Fourth, cut Android if your test devices or team bandwidth are thin, but keep the architecture cross-platform.
 Fifth, cut fancy guidance and keep a plain recommendation card with the room name.

Do **not** cut the full loop of **scan, story, question, save answer, recommend next artwork**. That loop is the product.

The exact recommendation

If your team asks for a single unambiguous decision, it is this:

**Build a React Native app with Expo and ViroReact, use Supabase for the structured content and answers, preload five public-domain Rijksmuseum artworks, get the images from Rijksmuseum collection pages and IIIF, and ship a guided micro-tour rather than a full-museum recognizer.** Vivino’s published approach points toward Vuforia Cloud Recognition for large-scale recognition later, but it is not the right first step for this 48 hour Rijksmuseum edition. [\[32\]](https://www.ptc.com/en/case-studies/vivino?srsltid=AfmBOopcolulGRsWnKsnU_L7iEg2k3unAsfaEOW4dPqtwIt_AS-_epLJ)



[\[1\] \[6\] \[13\]](https://reactvision.xyz/viro-react/) ViroReact \- Open-Source AR & VR for React Native and Expo

[https://reactvision.xyz/viro-react/](https://reactvision.xyz/viro-react/)

[\[2\] \[17\] \[30\]](https://www.rijksmuseum.nl/en/collection/object/The-Night-Watch-Militia-Company-of-District-II-under-the-Command-of-Captain-Frans-Banninck-Cocq--3137deb45cd7765f9a76084a16c99544) The Night Watch Militia Company of District II under the Command of Captain Frans Banninck Cocq \- Rijksmuseum

[https://www.rijksmuseum.nl/en/collection/object/The-Night-Watch-Militia-Company-of-District-II-under-the-Command-of-Captain-Frans-Banninck-Cocq--3137deb45cd7765f9a76084a16c99544](https://www.rijksmuseum.nl/en/collection/object/The-Night-Watch-Militia-Company-of-District-II-under-the-Command-of-Captain-Frans-Banninck-Cocq--3137deb45cd7765f9a76084a16c99544)

[\[3\] \[4\] \[5\] \[32\]](https://www.ptc.com/en/case-studies/vivino?srsltid=AfmBOopcolulGRsWnKsnU_L7iEg2k3unAsfaEOW4dPqtwIt_AS-_epLJ) Vivino's App to Identify Wine Labels | PTC

[https://www.ptc.com/en/case-studies/vivino?srsltid=AfmBOopcolulGRsWnKsnU\_L7iEg2k3unAsfaEOW4dPqtwIt\_AS-\_epLJ](https://www.ptc.com/en/case-studies/vivino?srsltid=AfmBOopcolulGRsWnKsnU_L7iEg2k3unAsfaEOW4dPqtwIt_AS-_epLJ)

[\[7\] \[23\] \[28\]](https://viro-community.readme.io/docs/image-recognition) Image Recognition

[https://viro-community.readme.io/docs/image-recognition](https://viro-community.readme.io/docs/image-recognition)

[\[8\] \[22\]](https://developer.apple.com/documentation/arkit/arworldtrackingconfiguration/detectionimages?utm_source=chatgpt.com) detectionImages | Apple Developer Documentation

[https://developer.apple.com/documentation/arkit/arworldtrackingconfiguration/detectionimages?utm\_source=chatgpt.com](https://developer.apple.com/documentation/arkit/arworldtrackingconfiguration/detectionimages?utm_source=chatgpt.com)

[\[9\]](https://docs.unity3d.com/Packages/com.unity.xr.arfoundation@4.0/manual/tracked-image-manager.html) AR tracked image manager | AR Foundation | 4.0.12

[https://docs.unity3d.com/Packages/com.unity.xr.arfoundation%404.0/manual/tracked-image-manager.html](https://docs.unity3d.com/Packages/com.unity.xr.arfoundation@4.0/manual/tracked-image-manager.html)

[\[10\]](https://developer.vuforia.com/library/?utm_source=chatgpt.com) Vuforia Engine Library

[https://developer.vuforia.com/library/?utm\_source=chatgpt.com](https://developer.vuforia.com/library/?utm_source=chatgpt.com)

[\[11\]](https://8thwall.org/?utm_source=chatgpt.com) 8th Wall \- Open Source AR & 3D

[https://8thwall.org/?utm\_source=chatgpt.com](https://8thwall.org/?utm_source=chatgpt.com)

[\[12\]](https://visioncamera.margelo.com/docs?utm_source=chatgpt.com) Getting Started | VisionCamera

[https://visioncamera.margelo.com/docs?utm\_source=chatgpt.com](https://visioncamera.margelo.com/docs?utm_source=chatgpt.com)

[\[14\]](https://data.rijksmuseum.nl/) Rijksmuseum Data Services | Rijksmuseum Data Services

[https://data.rijksmuseum.nl/](https://data.rijksmuseum.nl/)

[\[15\]](https://data.rijksmuseum.nl/docs/search) Search | Rijksmuseum Data Services

[https://data.rijksmuseum.nl/docs/search](https://data.rijksmuseum.nl/docs/search)

[\[16\] \[31\]](https://developers.google.com/ar/develop/augmented-images) Add dimension to images  |  ARCore  |  Google for Developers

[https://developers.google.com/ar/develop/augmented-images](https://developers.google.com/ar/develop/augmented-images)

[\[18\]](https://www.rijksmuseum.nl/en/collection/object/Het-melkmeisje--42dd0e658c2979aec8e144d2357c55c0) The Milkmaid \- Rijksmuseum

[https://www.rijksmuseum.nl/en/collection/object/Het-melkmeisje--42dd0e658c2979aec8e144d2357c55c0](https://www.rijksmuseum.nl/en/collection/object/Het-melkmeisje--42dd0e658c2979aec8e144d2357c55c0)

[\[19\]](https://www.rijksmuseum.nl/en/collection/object/The-Threatened-Swan--22040f90565e730131983a44a85b989f?tab=data) The Threatened Swan \- Rijksmuseum

[https://www.rijksmuseum.nl/en/collection/object/The-Threatened-Swan--22040f90565e730131983a44a85b989f?tab=data](https://www.rijksmuseum.nl/en/collection/object/The-Threatened-Swan--22040f90565e730131983a44a85b989f?tab=data)

[\[20\]](https://www.rijksmuseum.nl/en/collection/object/Self-portrait--72f97ac66c33f86b161cd51d62f7d365) Self-portrait \- Rijksmuseum

[https://www.rijksmuseum.nl/en/collection/object/Self-portrait--72f97ac66c33f86b161cd51d62f7d365](https://www.rijksmuseum.nl/en/collection/object/Self-portrait--72f97ac66c33f86b161cd51d62f7d365)

[\[21\] \[26\]](https://www.rijksmuseum.nl/en/collection/object/The-Merry-Drinker--884b50ad9157e0b12a90e4a5e8acf336?utm_source=chatgpt.com) The Merry Drinker

[https://www.rijksmuseum.nl/en/collection/object/The-Merry-Drinker--884b50ad9157e0b12a90e4a5e8acf336?utm\_source=chatgpt.com](https://www.rijksmuseum.nl/en/collection/object/The-Merry-Drinker--884b50ad9157e0b12a90e4a5e8acf336?utm_source=chatgpt.com)

[\[24\]](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native?utm_source=chatgpt.com) Build a User Management App with Expo React Native

[https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native?utm\_source=chatgpt.com](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native?utm_source=chatgpt.com)

[\[25\]](https://firebase.google.com/docs/firestore/manage-data/enable-offline?utm_source=chatgpt.com) Access data offline | Firestore \- Firebase

[https://firebase.google.com/docs/firestore/manage-data/enable-offline?utm\_source=chatgpt.com](https://firebase.google.com/docs/firestore/manage-data/enable-offline?utm_source=chatgpt.com)

[\[27\]](https://www.rijksmuseum.nl/en/research/image-requests) Image requests \- Rijksmuseum

[https://www.rijksmuseum.nl/en/research/image-requests](https://www.rijksmuseum.nl/en/research/image-requests)

[\[29\]](https://docs.expo.dev/versions/latest/sdk/speech/?utm_source=chatgpt.com) Speech

[https://docs.expo.dev/versions/latest/sdk/speech/?utm\_source=chatgpt.com](https://docs.expo.dev/versions/latest/sdk/speech/?utm_source=chatgpt.com)
