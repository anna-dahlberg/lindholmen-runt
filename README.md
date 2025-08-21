# Lindholmen Runt 🏃🏻‍♀️

En interaktiv träningsapp som guidar dig genom Lindholmens med anpassade övningar och rutter, perfekt för dig som vill klämma in lite träning under en rast eller lunch.

## Om appen

Vill du få in mer rörelse under arbets- eller studiedagen? Med Lindholmen runt blir det enkelt och roligare. Appen guidar dig till olika fina platser i området och på varje plats får du träningsövningar att göra. 

Oavsett om du går en runda på egen hand eller tillsammans med kollegor och vänner är *Lindholmen Runt* ett smidigt sätt att kombinera rörelse, hälsa och upplevelser i vardagen.

## Funktioner

- **Anpassningsbara rutter**: Välj mellan 10, 20 eller 30 minuters träningspass
- **Tre svårighetsgrader**: Låg, medel eller hög intensitet beroende på din nivå
- **Interaktiv karta**: GPS-spårning som guidar dig till varje träningsplats
- **Varierade övningar**: Olika övningar vid varje stopp för att hålla träningen intressant
- **Tidtagning**: Inbyggd timer för att följa ditt träningspass
- **Mobiloptimerad**: Designad för smartphones och surfplattor

## Teknisk information

### Teknologier
- **Frontend**: Vanilla JavaScript (ES6 modules)
- **Kartor**: Leaflet.js med OpenStreetMap
- **Styling**: CSS3 med custom properties
- **GPS**: Web Geolocation API
- **Responsiv design**: Mobile-first approach

## Rutter och platser

### 10-minuters rutt (4 stopp)
- Pingisbordet
- Lunchbryggan
- Bågen
- Restaurang Äran

### 20-minuters rutt (9 stopp)
Inkluderar alla 10-minuters stopp plus:
- Hasselbladsparken
- Trappan
- Lindholmens Pizzeria
- Rosenrabatten
- Rondellen

### 30-minuters rutt (11 stopp)
Inkluderar alla 20-minuters stopp plus:
- Rondelltrappan
- Närgången

## Övningstyper

Appen innehåller varierade övningar som:
- Dips mot bänk
- Armhävningar
- Sprinter
- Utfallssteg
- Situps
- Trappspringar
- Tåhävningar
- Plankor

Varje övning anpassas efter vald svårighetsgrad (låg/medel/hög).

### Lägga till nya rutter
Rutter definieras i `scripts/locations.js` med följande struktur:
```javascript
{
 id: 1,
 name: "Platsnamn",
 coordinates: [latitude, longitude],
 visited: false,
 easy_challenge: "Enkel övning",
 medium_challenge: "Medel övning", 
 hard_challenge: "Svår övning",
 exercise_id: 1
}
```
## Licens
Detta projekt är licensierat under MIT License - se LICENSE filen för detaljer.

*Lindholmen Runt - Din guide till aktiv vardag på Lindholmen!*