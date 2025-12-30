// Canales de TV organizados por categoría
// Fuente primaria: IPTV-ORG (canales públicos HLS sin límite de conexiones)
// Fuente secundaria: IPTV privado con formato TS (límite 3 conexiones)

const IPTV_BASE = 'http://vionixtv.lat:80/live/atyHcyHAVv/Y6HQ8MW2YR';

export const channels = {
  // ==================== CANALES PUBLICOS (SIN LIMITE DE CONEXIONES) ====================
  'Publicos Argentina': [
    { id: 'pub-canal26', name: 'Canal 26', url: 'https://stream-gtlc.telecentro.net.ar/hls/canal26hls/main.m3u8', logo: 'https://pbs.twimg.com/profile_images/1242114940/LogoCanal26_400x400.jpg' },
    { id: 'pub-america', name: 'America TV', url: 'https://prepublish.f.qaotic.net/a07/americahls-100056/playlist_720p.m3u8', logo: 'https://static.wikia.nocookie.net/logopedia/images/9/99/Am%C3%A9rica_Canal_2_2005.svg' },
    { id: 'pub-canal-e', name: 'Canal E', url: 'https://unlimited1-us.dps.live/perfiltv/perfiltv.smil/playlist.m3u8', logo: 'https://i.ibb.co/8rpSC43/ciudad.png' },
    { id: 'pub-cn247', name: '24/7 Canal de Noticias', url: 'https://panel.host-live.com:19360/cn247tv/cn247tv.m3u8', logo: 'https://cn247.tv/wp-content/uploads/2021/11/neuquen-gobierno-logo.png' },
    { id: 'pub-argentinisima', name: 'Argentinisima Satelital', url: 'https://stream1.sersat.com/hls/argentinisima.m3u8', logo: 'https://i.ibb.co/GW7gN3g/telefe.png' },
    { id: 'pub-aire-santa-fe', name: 'Aire de Santa Fe', url: 'https://unlimited1-us.dps.live/airedesantafetv/airedesantafetv.smil/playlist.m3u8', logo: 'https://i.postimg.cc/hjFKtFpc/1.png' },
    { id: 'pub-13max', name: '13Max Television', url: 'http://coninfo.net:1935/13maxhd/live13maxtvnuevo/playlist.m3u8', logo: 'https://i.ibb.co/qM8Q3qk/el-trece.png' },
    { id: 'pub-net-tv', name: 'Net TV', url: 'https://unlimited1-us.dps.live/nettv/nettv.smil/playlist.m3u8', logo: 'https://canalnet.tv/_templates/mobile/includes/img/_logo-alt.png' },
    { id: 'pub-tv-universidad', name: 'TV Universidad UNLP', url: 'https://stratus.stream.cespi.unlp.edu.ar/hls/tvunlp.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/UNLP_logo.svg/1200px-UNLP_logo.svg.png' },
  ],

  'Publicos Peru': [
    { id: 'pub-pe-atv', name: 'ATV Peru', url: 'https://alba-pe-atv-atv.stream.mediatiquestream.com/index.m3u8', logo: 'http://ceoapps.org/logos/atv.png' },
    { id: 'pub-pe-atv-plus', name: 'ATV+ Peru', url: 'https://alba-pe-atv-atvmas.stream.mediatiquestream.com/index.m3u8', logo: 'https://i.ibb.co/s9DXfML/ATV.png' },
    { id: 'pub-pe-latina', name: 'Latina', url: 'https://redirector.rudo.video/hls-video/567ffde3fa319fadf3419efda25619456231dfea/latina/latina.smil/playlist.m3u8', logo: 'https://elcomercio.pe/resizer/lSJS13pKkn0cX2OFSyuZqwRcXFg=/1200x1200/smart/filters:format(jpeg):quality(75)/cloudfront-us-east-1.images.arcpublishing.com/elcomercio/OMZVEA5IKFFTJJ3VVN3IP7ZVD4.jpg' },
    { id: 'pub-pe-tvperu', name: 'TV Peru', url: 'https://cdnhd.iblups.com/hls/777b4d4cc0984575a7d14f6ee57dbcaf7.m3u8', logo: 'http://ceoapps.org/logos/tvperu.png' },
    { id: 'pub-pe-rpp', name: 'RPP TV', url: 'https://redirector.rudo.video/hls-video/567ffde3fa319fadf3419efda25619456231dfea/rpptv/rpptv.smil/playlist.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/04/RPP_TV_-_2017_logo.png' },
    { id: 'pub-pe-exitosa', name: 'Exitosa', url: 'https://luna-1-video.mediaserver.digital/exitosatv_233b-4b49-a726-5a3cb0e3243c/video.m3u8', logo: 'http://ceoapps.org/logos/exitosape.png' },
    { id: 'pub-pe-bethel', name: 'Bethel TV', url: 'https://alfa.betheltv.tv/srt/3_abr/playlist.m3u8', logo: 'https://i.ibb.co/WVr4M6g/images-1.jpg' },
  ],

  'Publicos Chile': [
    { id: 'pub-cl-atv', name: 'Antofagasta TV', url: 'https://unlimited6-cl.dps.live/atv/atv.smil/playlist.m3u8', logo: 'https://i.postimg.cc/43H2F05s/1.png' },
    { id: 'pub-cl-tvu', name: 'TVU Concepcion', url: 'https://unlimited1-cl-isp.dps.live/tvu/tvu.smil/playlist.m3u8', logo: 'https://i.postimg.cc/nV3KBk4k/1.png' },
    { id: 'pub-cl-contivision', name: 'Contivision Noticias', url: 'https://unlimited6-cl.dps.live/cm/cm.smil/playlist.m3u8', logo: 'https://cdn.m3u.cl/logo/790_La_Red.png' },
    { id: 'pub-cl-atacama', name: 'Atacama Noticias', url: 'https://v2.tustreaming.cl/atacamanoticias/index.m3u8', logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWxWLCvtyoA7kEXrdQGpaRyAa0rueu3Y53xA&s' },
  ],

  'Publicos Mexico': [
    { id: 'pub-mx-adn40', name: 'ADN 40', url: 'https://mdstrm.com/live-stream-playlist/60b578b060947317de7b57ac.m3u8', logo: 'https://th.bing.com/th/id/R.d46444904658ce1e4f895c0338ce27c1' },
    { id: 'pub-mx-azteca-uno', name: 'Azteca Uno', url: 'https://mdstrm.com/live-stream-playlist/609b243156cca108312822a6.m3u8', logo: 'https://astramain.xyz/images/LDN_2LoxNi45aNO9u6WClIggHdenumRsYVXKF6cYDUfCnTeWAj9R3ecDt9NgQOGY.png' },
    { id: 'pub-mx-azteca-7', name: 'Azteca 7', url: 'https://mdstrm.com/live-stream-playlist/609ad46a7a441137107d7a81.m3u8', logo: 'https://th.bing.com/th/id/R.8d2c63c490282116786291a737250183' },
    { id: 'pub-mx-azteca-int', name: 'Azteca Internacional', url: 'https://azt-mun.otteravision.com/azt/mun/mun.m3u8', logo: 'http://icomplay.net:80/images/DLu6wPayhmXi4Shb7v3BInGpATQN_fOPiLzdzS4MC6MZv6K0_NJCLbdzQOUhCYsc.png' },
    { id: 'pub-mx-amx-noticias', name: 'AMX Noticias', url: 'https://5e50264bd6766.streamlock.net/mexiquense2/videomexiquense2/playlist.m3u8', logo: 'http://icomplay.net:80/images/SyQb0CSmjWAheouRMfZPMaLkmcwQBo-vjDBV53hJi8F3wiD5AQU6JM9HP8kDH97Y.png' },
    { id: 'pub-mx-8ntv', name: '8NTV', url: 'https://60417ddeaf0d9.streamlock.net/ntv/videontv/playlist.m3u8', logo: 'https://i.imgur.com/QDT0gcA.png' },
    { id: 'pub-mx-canal10-chiapas', name: 'Canal 10 Chiapas', url: 'https://5ca9af4645e15.streamlock.net/chiapas/videochiapas/playlist.m3u8', logo: 'https://i.imgur.com/QDT0gcA.png' },
  ],

  'Publicos Paraguay': [
    { id: 'pub-py-4dmas', name: '4DmasNoticias TV', url: 'https://rds3.desdeparaguay.net/4dmasnoticiastv/4dmasnoticiastv/playlist.m3u8', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/NPY_(Noticias_Paraguay).png/1200px-NPY_(Noticias_Paraguay).png' },
    { id: 'pub-py-causa', name: 'Causa Comun TV', url: 'https://live.enhdtv.com:8081/8172/index.m3u8', logo: 'https://i.ibb.co/zHf8F2r/npy.png' },
  ],

  // ==================== RADIOS NOTICIAS (SIN LIMITE) ====================
  'Radios Argentina': [
    { id: 'radio-mitre', name: 'Radio Mitre AM 790', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/AM790_56.mp3', logo: '/logos/radios/radio-mitre.svg', isAudio: true },
    { id: 'radio-la-red', name: 'La Red AM 910', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/LA_RED_AM910AAC.aac', logo: '/logos/radios/la-red.svg', isAudio: true },
    { id: 'radio-rivadavia', name: 'Radio Rivadavia AM 630', url: 'https://27393.live.streamtheworld.com/RIVADAVIAAAC.aac', logo: '/logos/radios/rivadavia.svg', isAudio: true },
    { id: 'radio-am750', name: 'AM 750', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/AM750AAC.aac', logo: '/logos/radios/am750.svg', isAudio: true },
    { id: 'radio-la990', name: 'La 990 AM', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/AM990AAC.aac', logo: '/logos/radios/la990.svg', isAudio: true },
    { id: 'radio-metro', name: 'Metro 95.1 FM', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/METROAAC.aac', logo: '/logos/radios/metro951.svg', isAudio: true },
    { id: 'radio-rockandpop', name: 'Rock & Pop 95.9 FM', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/ROCKANDPOP.mp3', logo: '/logos/radios/rockandpop.svg', isAudio: true },
    { id: 'radio-la100', name: 'La 100 FM 99.9', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/FM999_56AAC.aac', logo: '/logos/radios/la100.svg', isAudio: true },
    { id: 'radio-blue', name: 'Blue FM 100.7', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/BLUE_FM_100_7AAC.aac', logo: '/logos/radios/bluefm.svg', isAudio: true },
    { id: 'radio-uno', name: 'Radio Uno 103.1 FM', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/UNOAAC.aac', logo: '/logos/radios/radiouno.svg', isAudio: true },
    { id: 'radio-cadena3', name: 'Cadena 3', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO3.mp3', logo: '/logos/radios/cadena3.svg', isAudio: true },
  ],

  // ==================== NOTICIAS ====================
  'Noticias': [
    { id: 'tn-opc1', name: 'TN (Todo Noticias)', url: `${IPTV_BASE}/573881.ts`, logo: 'https://i.postimg.cc/Bvsx0p1w/Sin-t-tulo-8-removebg-preview.png' },
    { id: 'tn-opc2', name: 'TN OPC2', url: `${IPTV_BASE}/673708.ts`, logo: 'https://i.postimg.cc/Bvsx0p1w/Sin-t-tulo-8-removebg-preview.png' },
    { id: 'c5n-opc1', name: 'C5N', url: `${IPTV_BASE}/573905.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjapW9LNwBHOTAAe689A_mFZ7jT9p6UaINPQ&s' },
    { id: 'c5n-opc2', name: 'C5N OPC2', url: `${IPTV_BASE}/573906.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjapW9LNwBHOTAAe689A_mFZ7jT9p6UaINPQ&s' },
    { id: 'cronica', name: 'Cronica TV', url: `${IPTV_BASE}/573917.ts`, logo: 'https://i.ibb.co/Z1yCkFY/cronica.png' },
    { id: 'a24-opc1', name: 'A24', url: `${IPTV_BASE}/573899.ts`, logo: 'http://www.tmsimg.com/assets/s16272_ll_h3_ab.png' },
    { id: 'canal26-opc1', name: 'Canal 26', url: `${IPTV_BASE}/573884.ts`, logo: 'https://pbs.twimg.com/profile_images/1242114940/LogoCanal26_400x400.jpg' },
    { id: 'canal26-opc2', name: 'Canal 26 OPC2', url: `${IPTV_BASE}/573885.ts`, logo: 'https://pbs.twimg.com/profile_images/1242114940/LogoCanal26_400x400.jpg' },
    { id: 'lanacion-opc1', name: 'LN+ (La Nacion)', url: `${IPTV_BASE}/573927.ts`, logo: 'https://carbisis.com.ar/wp-content/uploads/2022/06/La-Nacion-Mas-Logo-1.png' },
    { id: 'lanacion-opc2', name: 'LN+ OPC2', url: `${IPTV_BASE}/573928.ts`, logo: 'https://carbisis.com.ar/wp-content/uploads/2022/06/La-Nacion-Mas-Logo-1.png' },
    { id: 'caracol-noticias', name: 'Caracol Noticias', url: `${IPTV_BASE}/614209.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSsOdrrs8d3-MV_IXYN9Su9fqFlybtAxNIiFg&s' },
    { id: 'cnn-chile', name: 'CNN Chile', url: `${IPTV_BASE}/614205.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSG-_jMqZ05wvSAwwjO5fW8FOrrgkdYzIxd7A&s' },
    { id: 'cnn-espanol-opc1', name: 'CNN Espanol', url: `${IPTV_BASE}/572546.ts`, logo: 'http://icomplay.net:80/images/yJgtMZWslHIkXGjbS6hbw4zsysVPZIwF4BLnBmpBvtW1wB5X5Mzh8GsNn4fUT099f3pI9kCTUCSJqJ8fIuug6h9BG1v-bLAhd8CRiKQhsM0.png' },
    { id: 'cnn-espanol-opc2', name: 'CNN Espanol OPC2', url: `${IPTV_BASE}/598857.ts`, logo: 'http://icomplay.net:80/images/yJgtMZWslHIkXGjbS6hbw4zsysVPZIwF4BLnBmpBvtW1wB5X5Mzh8GsNn4fUT099f3pI9kCTUCSJqJ8fIuug6h9BG1v-bLAhd8CRiKQhsM0.png' },
    { id: 'cnn-mexico', name: 'CNN Mexico', url: `${IPTV_BASE}/614206.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQgbujzqrOiTSltrbzH0-8MJCCpPewEyHJgUQ&s' },
    { id: 'cnn-usa', name: 'CNN USA', url: `${IPTV_BASE}/614207.ts`, logo: 'http://icomplay.net:80/images/yJgtMZWslHIkXGjbS6hbw4zsysVPZIwF4BLnBmpBvtW1wB5X5Mzh8GsNn4fUT099f3pI9kCTUCSJqJ8fIuug6h9BG1v-bLAhd8CRiKQhsM0.png' },
    { id: 'fox-news', name: 'Fox News HD', url: `${IPTV_BASE}/593489.ts`, logo: 'http://onerestream.us/images/oRSVtQmvjEt-kpHzrlCGJrGfQHvXD690dLQa0cqK_G6BasBYpBngKsok9HZ852Z8.jpeg' },
    { id: 'rt-noticias', name: 'RT Noticias', url: `${IPTV_BASE}/614208.ts`, logo: 'http://atlantis-mx.com/channels/logos/69050564dc97f.png' },
    { id: 'univision-noticias', name: 'Univision Noticias', url: `${IPTV_BASE}/548486.ts`, logo: 'https://1000marcas.net/wp-content/uploads/2023/10/Univision-Logo-thmb.png' },
    { id: 'amx-noticias-opc1', name: 'AMX Noticias', url: `${IPTV_BASE}/572459.ts`, logo: 'http://icomplay.net:80/images/SyQb0CSmjWAheouRMfZPMaLkmcwQBo-vjDBV53hJi8F3wiD5AQU6JM9HP8kDH97Y.png' },
    { id: 'amx-noticias-opc2', name: 'AMX Noticias OPC2', url: `${IPTV_BASE}/598768.ts`, logo: 'http://icomplay.net:80/images/SyQb0CSmjWAheouRMfZPMaLkmcwQBo-vjDBV53hJi8F3wiD5AQU6JM9HP8kDH97Y.png' },
    { id: 'foro-tv-opc1', name: 'Foro TV', url: `${IPTV_BASE}/572597.ts`, logo: 'https://img.asmedia.epimg.net/resizer/8z-sYRzwUzhXh5EncIgTivt6Idg=/1472x828/cloudfront-eu-central-1.images.arcpublishing.com/diarioas/EW3U7NAIBNCOZCYGAGD3NYY54A.jpg' },
    { id: 'foro-tv-opc2', name: 'Foro TV OPC2', url: `${IPTV_BASE}/598860.ts`, logo: 'https://img.asmedia.epimg.net/resizer/8z-sYRzwUzhXh5EncIgTivt6Idg=/1472x828/cloudfront-eu-central-1.images.arcpublishing.com/diarioas/EW3U7NAIBNCOZCYGAGD3NYY54A.jpg' },
    { id: 'milenio-opc1', name: 'Milenio', url: `${IPTV_BASE}/572687.ts`, logo: 'https://i.ibb.co/vJ1nCLt/mx-milenio-tv-m.png' },
    { id: 'milenio-opc2', name: 'Milenio OPC2', url: `${IPTV_BASE}/598871.ts`, logo: 'https://i.ibb.co/vJ1nCLt/mx-milenio-tv-m.png' },
    { id: 'teleformula', name: 'Teleformula', url: `${IPTV_BASE}/598882.ts`, logo: 'https://1.bp.blogspot.com/-tONcdV2Tt5o/Xu6RWoh4QPI/AAAAAAAAJ7I/m4j6YGNPVdoN4a24cTlTElWDYFiwSI_7gCLcBGAsYHQ/s1600/teleformula.png' },
    { id: 'tv-peru-noticias', name: 'TV Peru Noticias', url: `${IPTV_BASE}/571065.ts`, logo: 'http://ceoapps.org/logos/tvperu.png' },
    { id: 'noticias-py', name: 'Noticias Paraguay', url: `${IPTV_BASE}/571312.ts`, logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/NPY_(Noticias_Paraguay).png/1200px-NPY_(Noticias_Paraguay).png' },
  ],

  // ==================== ARGENTINA ====================
  'Argentina': [
    { id: 'telefe-opc1', name: 'Telefe', url: `${IPTV_BASE}/660509.ts`, logo: 'https://i.ibb.co/GW7gN3g/telefe.png' },
    { id: 'telefe-opc2', name: 'Telefe OPC2', url: `${IPTV_BASE}/573941.ts`, logo: 'https://i.ibb.co/GW7gN3g/telefe.png' },
    { id: 'eltrece-opc1', name: 'El Trece', url: `${IPTV_BASE}/573922.ts`, logo: 'https://i.ibb.co/qM8Q3qk/el-trece.png' },
    { id: 'eltrece-opc2', name: 'El Trece OPC2', url: `${IPTV_BASE}/573923.ts`, logo: 'https://i.ibb.co/qM8Q3qk/el-trece.png' },
    { id: 'elnueve-opc1', name: 'El Nueve', url: `${IPTV_BASE}/673809.ts`, logo: 'http://stalkertvlatinoplay.com/LOGOS/ARGENTINA/ELNUEVE.png' },
    { id: 'elnueve-opc2', name: 'El Nueve OPC2', url: `${IPTV_BASE}/573920.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0MuLktoJ1Ku08T8baeuxxinzSC3xjvEjQXQ&s' },
    { id: 'america-opc1', name: 'America', url: `${IPTV_BASE}/573902.ts`, logo: 'https://static.wikia.nocookie.net/logopedia/images/9/99/Am%C3%A9rica_Canal_2_2005.svg/revision/latest/scale-to-width-down/225?cb=20230314194109&path-prefix=es' },
    { id: 'america-opc2', name: 'America OPC2', url: `${IPTV_BASE}/573903.ts`, logo: 'https://static.wikia.nocookie.net/logopedia/images/9/99/Am%C3%A9rica_Canal_2_2005.svg/revision/latest/scale-to-width-down/225?cb=20230314194109&path-prefix=es' },
    { id: 'tvpublica-opc1', name: 'TV Publica', url: `${IPTV_BASE}/573949.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSHwirhLVqFXVWOqIW3bABttTSEHznHq5nFDQ&s' },
    { id: 'tvpublica-opc2', name: 'TV Publica OPC2', url: `${IPTV_BASE}/673707.ts`, logo: 'https://astramain.xyz/images/LDN_2LoxNi45aNO9u6WClMI_sy7Q5x18lMKbNRtKL-FA2I9_nHUj3uCJ0Qs-Ronp.png' },
    { id: 'net-tv-opc1', name: 'Net TV', url: `${IPTV_BASE}/573932.ts`, logo: 'https://canalnet.tv/_templates/mobile/includes/img/_logo-alt.png' },
    { id: 'net-tv-opc2', name: 'Net TV OPC2', url: `${IPTV_BASE}/573933.ts`, logo: 'https://canalnet.tv/_templates/mobile/includes/img/_logo-alt.png' },
    { id: 'ciudad-magazine-opc1', name: 'Ciudad Magazine', url: `${IPTV_BASE}/573913.ts`, logo: 'https://i.ibb.co/8rpSC43/ciudad.png' },
    { id: 'ciudad-magazine-opc2', name: 'Ciudad Magazine OPC2', url: `${IPTV_BASE}/573914.ts`, logo: 'https://i.ibb.co/8rpSC43/ciudad.png' },
    { id: 'cine-argentino-opc1', name: 'Cine Argentino', url: `${IPTV_BASE}/573910.ts`, logo: 'https://i.ibb.co/8NwxhSV/cine-ar.png' },
    { id: 'cine-argentino-opc2', name: 'Cine Argentino OPC2', url: `${IPTV_BASE}/573911.ts`, logo: 'https://i.ibb.co/8NwxhSV/cine-ar.png' },
    { id: 'volver', name: 'Volver', url: `${IPTV_BASE}/573952.ts`, logo: 'https://i.ibb.co/9hjHHBL/volver.png' },
    { id: 'garage-tv', name: 'Garage TV HD', url: `${IPTV_BASE}/573925.ts`, logo: 'https://cdn.mitvstatic.com/channels/ar_el-garage_m.png' },
    { id: 'telemax-opc1', name: 'Telemax', url: `${IPTV_BASE}/573943.ts`, logo: 'https://pbs.twimg.com/profile_images/1083024133062123521/cHU8zOpn_400x400.jpg' },
    { id: 'telemax-opc2', name: 'Telemax OPC2', url: `${IPTV_BASE}/573944.ts`, logo: 'https://pbs.twimg.com/profile_images/1083024133062123521/cHU8zOpn_400x400.jpg' },
    { id: 'orbe21', name: 'Orbe 21', url: `${IPTV_BASE}/573935.ts`, logo: 'https://cdn.mitvstatic.com/channels/ar_canal-orbe-21_m.png' },
    { id: 'neo-tv', name: 'Neo TV', url: `${IPTV_BASE}/573931.ts`, logo: 'https://i2.paste.pics/085efda10687fd80ddb05de1600f41e0.png' },
  ],

  // ==================== ARGENTINA INTERIOR ====================
  'Argentina Interior': [
    { id: '9-salta-opc1', name: 'Canal 9 Salta', url: `${IPTV_BASE}/573897.ts`, logo: 'https://i.ibb.co/fkpsStS/canal-9.png' },
    { id: '9-salta-opc2', name: 'Canal 9 Salta OPC2', url: `${IPTV_BASE}/573898.ts`, logo: 'https://i.ibb.co/fkpsStS/canal-9.png' },
    { id: 'canal7-salta', name: 'Canal 7 Salta', url: `${IPTV_BASE}/653671.ts`, logo: 'https://i.imgur.com/CudG6sl.png' },
    { id: 'eldoce-cordoba', name: 'El Doce (Cordoba)', url: `${IPTV_BASE}/609902.ts`, logo: 'https://wikiwandv2-19431.kxcdn.com/_next/image?url=https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/El_doce_tv_cba_logo.png/640px-El_doce_tv_cba_logo.png&w=640&q=50' },
    { id: 'canal7-mendoza', name: 'Canal 7 Mendoza', url: `${IPTV_BASE}/629910.ts`, logo: 'https://i.ibb.co/9k79DZ0H/Whats-App-Image-2024-10-05-at-17-19-08.jpg' },
    { id: 'latina-tv-mendoza', name: 'Latina TV Mendoza', url: `${IPTV_BASE}/615360.ts`, logo: 'https://cdn.m3u.cl/logo/1621_Latina_TV_Mendoza.png' },
    { id: 'canal9-televida', name: 'Canal 9 Tele Vida', url: `${IPTV_BASE}/629210.ts`, logo: 'https://goldenlatino.vip/images/tBMrYs6BOuz3ao5YRlhyb93L6bNlB7wXS5zsIWAXLF_FZO7hIEHUHHIk86eHJBCkZZXZETj2ECtAKkojNflxWCucIS711TtvUd5RhFAXlsImA7XATIh-w8v7RmVhmr0ogN4PmM84SdH_0QE6p10N5Q.png' },
    { id: 'celta-tv', name: 'Celta TV', url: `${IPTV_BASE}/573908.ts`, logo: 'https://iot.org.ar/wp-content/uploads/2020/12/logo-celta-tv.jpg' },
    { id: 'chaco-tv', name: 'Chaco TV', url: `${IPTV_BASE}/573909.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSt6-W6DkjPVVuXBxQbc4K3KILldntMLZR_iw&s' },
    { id: 'cn247-neuquen', name: 'CN 24/7 Neuquen', url: `${IPTV_BASE}/573915.ts`, logo: 'https://cn247.tv/wp-content/uploads/2021/11/neuquen-gobierno-logo.png' },
    { id: 'la-provincia', name: 'La Provincia', url: `${IPTV_BASE}/573930.ts`, logo: 'https://canalprovincial.com.ar/wp-content/themes/canalprovincia/images/logo.jpg' },
    { id: 'santa-fe', name: 'Canal Santa Fe', url: `${IPTV_BASE}/573939.ts`, logo: 'https://i.postimg.cc/hjFKtFpc/1.png' },
    { id: 'rtn', name: 'RTN', url: `${IPTV_BASE}/573938.ts`, logo: 'https://pbs.twimg.com/profile_images/1829646108852686848/5glyfgw8_400x400.jpg' },
    { id: 'multivision', name: 'Multivision', url: `${IPTV_BASE}/653670.ts`, logo: 'https://yt3.googleusercontent.com/ytc/AIdro_lE4bIqEKKkb_clJvPrtrvSo0feeG8MiyEdXowWDUFYlQ=s900-c-k-c0x00ffffff-no-rj' },
    { id: 'uni-teve', name: 'Uni Teve', url: `${IPTV_BASE}/573951.ts`, logo: 'https://yt3.googleusercontent.com/ytc/AIf8zZRUKIPd-0iXgVZesvixX2LU9OZ29R6J2_89fnaDpQ=s900-c-k-c0x00ffffff-no-rj' },
  ],

  // ==================== MEXICO ====================
  'Mexico': [
    { id: 'las-estrellas-opc1', name: 'Las Estrellas', url: `${IPTV_BASE}/653837.ts`, logo: 'https://i.ibb.co/SRQxnY4/images.png' },
    { id: 'las-estrellas-opc2', name: 'Las Estrellas OPC2', url: `${IPTV_BASE}/598863.ts`, logo: 'https://i.ibb.co/SRQxnY4/images.png' },
    { id: 'azteca-uno', name: 'Azteca Uno', url: `${IPTV_BASE}/572494.ts`, logo: 'https://astramain.xyz/images/LDN_2LoxNi45aNO9u6WClIggHdenumRsYVXKF6cYDUfCnTeWAj9R3ecDt9NgQOGY.png' },
    { id: 'azteca-7-monterrey', name: 'Azteca 7 Monterrey', url: `${IPTV_BASE}/651345.ts`, logo: 'https://th.bing.com/th/id/R.8d2c63c490282116786291a737250183?rik=Vd/l4zH+2G9KOQ&riu=http://img3.wikia.nocookie.net/__cb20140426231035/doblaje/es/images/a/a9/Azteca_7_Logo.png&ehk=qWEz8wM32EqWNjpZainrprHQFku5975yAsE8N5Dzr60=&risl=&pid=ImgRaw&r=0' },
    { id: 'canal-5-opc1', name: 'Canal 5', url: `${IPTV_BASE}/891995.ts`, logo: 'http://www.tmsimg.com/assets/s16463_ll_h3_aa.png' },
    { id: 'canal-nu9ve', name: 'Canal Nu9ve', url: `${IPTV_BASE}/572535.ts`, logo: 'http://icomplay.net:80/images/yJgtMZWslHIkXGjbS6hbwyIYuxpBCeD1SOsaZnhmBT_SqnTyGJt8qlIkG6nDinHt--HN9Odxj0BqKt2oC3T3kWH9NUsKNwOt--mbCol7EoY.png' },
    { id: 'canal-once', name: 'Canal Once', url: `${IPTV_BASE}/572718.ts`, logo: 'https://btv.mx/posters/1724198860348.png' },
    { id: 'canal-14', name: 'Canal 14', url: `${IPTV_BASE}/572512.ts`, logo: 'https://i.imgur.com/QDT0gcA.png' },
    { id: 'canal-22', name: 'Canal 22', url: `${IPTV_BASE}/572832.ts`, logo: 'https://i.imgur.com/uFUmX5f.png' },
    { id: 'imagen-tv', name: 'Imagen TV', url: `${IPTV_BASE}/572838.ts`, logo: 'https://i.imgur.com/ubPVDAg.png' },
    { id: 'adn-40', name: 'ADN 40', url: `${IPTV_BASE}/572447.ts`, logo: 'https://th.bing.com/th/id/R.d46444904658ce1e4f895c0338ce27c1?rik=wQLUrCQ6fdNFzQ&riu=http%3a%2f%2fdirectostv.teleame.com%2fwp-content%2fuploads%2f2018%2f02%2fADN-40-en-vivo-Online.png&ehk=%2fhGu0g2u9i5yfict%2fDb8xgEzRBujBfIgEZ7itohFsQ8%3d&risl=&pid=ImgRaw&r=0' },
    { id: 'multimedios', name: 'Multimedios', url: `${IPTV_BASE}/572846.ts`, logo: 'https://pbs.twimg.com/media/ERj-Rw5UYAATFs4.png' },
    { id: 'multimedios-monterrey', name: 'Multimedios Monterrey', url: `${IPTV_BASE}/572852.ts`, logo: 'https://pbs.twimg.com/media/ERj-Rw5UYAATFs4.png' },
    { id: 'multimedios-cdmx', name: 'Multimedios CDMX', url: `${IPTV_BASE}/572849.ts`, logo: 'https://pbs.twimg.com/media/ERj-Rw5UYAATFs4.png' },
    { id: 'multimedios-guadalajara', name: 'Multimedios Guadalajara', url: `${IPTV_BASE}/572850.ts`, logo: 'https://pbs.twimg.com/media/ERj-Rw5UYAATFs4.png' },
    { id: 'azteca-deportes', name: 'Azteca Deportes', url: `${IPTV_BASE}/572488.ts`, logo: 'https://arestv.vip/images/Bp-vRtZEje6kFpdMZzWxZwomsSTcJRUoSkySIZ4aHGwOAyDtPO_H0HZIECrFLeBFfdbI6M3aqARLRbn5rX2EolqyKcMHPslCzY3DA92ev3w.png' },
    { id: 'azteca-internacional', name: 'Azteca Internacional', url: `${IPTV_BASE}/572824.ts`, logo: 'http://icomplay.net:80/images/DLu6wPayhmXi4Shb7v3BInGpATQN_fOPiLzdzS4MC6MZv6K0_NJCLbdzQOUhCYsc.png' },
    { id: 'tv-unam', name: 'TV UNAM', url: `${IPTV_BASE}/572869.ts`, logo: 'https://i.imgur.com/gRspLjD.png' },
    { id: 'canal-4-guadalajara', name: 'Canal 4 Guadalajara', url: `${IPTV_BASE}/598861.ts`, logo: 'https://arestv.vip/images/vQIjAnKmdTArDQNEHKQgJyxXZM8dp5Cg_5OQCIYfcYacH4xKb9Rm0MvJu138l1ea.png' },
    { id: 'telemax-mx', name: 'Telemax', url: `${IPTV_BASE}/572759.ts`, logo: 'https://astramain.xyz/images/ayfdHaSGfQQ7HLxmvsjLePFL2K8XYmWjpB_wyxWgojzRZ_Yz4K8DOIppwSaLkq7_cNHCT6oKEMyXRdtWGSwTng.png' },
    { id: 'canal-10-cancun', name: 'Canal 10 Cancun', url: `${IPTV_BASE}/572830.ts`, logo: 'https://s3-us-west-1.amazonaws.com/canal10/photos/96800/original.jpg' },
    { id: 'tele-yucatan', name: 'Tele Yucatan', url: `${IPTV_BASE}/641553.ts`, logo: 'http://onerestream.us/images/CVYTwmEJLRXyxsIOD2gej5iLYDSisdrrPRIK6znU6iU.png' },
    { id: 'mexiquense', name: 'Mexiquense', url: `${IPTV_BASE}/598870.ts`, logo: 'https://i.imgur.com/QDT0gcA.png' },
  ],

  // ==================== CHILE ====================
  'Chile': [
    { id: 'tvn-chile-opc1', name: 'TVN Chile', url: `${IPTV_BASE}/576254.ts`, logo: 'https://i.postimg.cc/43H2F05s/1.png' },
    { id: 'tvn-chile-opc2', name: 'TVN Chile OPC2', url: `${IPTV_BASE}/576255.ts`, logo: 'https://i.postimg.cc/43H2F05s/1.png' },
    { id: 'mega-opc1', name: 'Mega', url: `${IPTV_BASE}/576241.ts`, logo: 'http://icomplay.net:80/images/gS8r0NdehRHd2E9l02GNY01ZUY8cLvH6OH7QaTrzJdlEzzhTYU08y-c02awS6FHvuYxEuUQ-532I2NzjR-nZDg.jpg' },
    { id: 'mega-opc2', name: 'Mega OPC2', url: `${IPTV_BASE}/576243.ts`, logo: 'http://icomplay.net:80/images/gS8r0NdehRHd2E9l02GNY01ZUY8cLvH6OH7QaTrzJdlEzzhTYU08y-c02awS6FHvuYxEuUQ-532I2NzjR-nZDg.jpg' },
    { id: 'mega-2', name: 'Mega 2', url: `${IPTV_BASE}/635833.ts`, logo: 'https://i.postimg.cc/3JF7Qvf1/Sin-t-tulo-removebg-preview.png' },
    { id: 'chilevision-opc1', name: 'Chilevision', url: `${IPTV_BASE}/576226.ts`, logo: 'http://icomplay.net:80/images/gS8r0NdehRHd2E9l02GNYx68Aa3MGdW2oo8xdLyu9g9VLNsb777FbK8RwhMReilnt8us74yTZqQUgxik0cQBoA.jpg' },
    { id: 'chilevision-opc2', name: 'Chilevision OPC2', url: `${IPTV_BASE}/576228.ts`, logo: 'http://icomplay.net:80/images/gS8r0NdehRHd2E9l02GNYx68Aa3MGdW2oo8xdLyu9g9VLNsb777FbK8RwhMReilnt8us74yTZqQUgxik0cQBoA.jpg' },
    { id: 'canal13-chile-opc1', name: 'Canal 13', url: `${IPTV_BASE}/576217.ts`, logo: 'https://static.wikia.nocookie.net/logopedia/images/c/c2/Canal_13C_2025.svg/revision/latest/scale-to-width-down/200?cb=20250415234114' },
    { id: 'canal13-chile-opc2', name: 'Canal 13 OPC2', url: `${IPTV_BASE}/635247.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQVL8vb1x_b3LN_aVqEqXtsuU-JqE9fuu5I8Q&s' },
    { id: 't13', name: 'T13', url: `${IPTV_BASE}/576252.ts`, logo: 'https://i.postimg.cc/ryj07wzF/1.png' },
    { id: '24-horas-opc1', name: '24 Horas', url: `${IPTV_BASE}/576220.ts`, logo: 'https://th.bing.com/th/id/R.fbed137ffa6359ee794c485c290cca68?rik=2JH0XW6AvcPXoQ&riu=http%3a%2f%2fupload.wikimedia.org%2fwikipedia%2fcommons%2f6%2f6b%2fLogotipo_del_Canal_24_Horas.png&ehk=dX2dDTaAAcz1kDGDzKLC6VHbQiwDihqBAsTRsQ%2bNS28%3d&risl=&pid=ImgRaw&r=0' },
    { id: '24-horas-opc2', name: '24 Horas OPC2', url: `${IPTV_BASE}/576221.ts`, logo: 'https://th.bing.com/th/id/R.fbed137ffa6359ee794c485c290cca68?rik=2JH0XW6AvcPXoQ&riu=http%3a%2f%2fupload.wikimedia.org%2fwikipedia%2fcommons%2f6%2f6b%2fLogotipo_del_Canal_24_Horas.png&ehk=dX2dDTaAAcz1kDGDzKLC6VHbQiwDihqBAsTRsQ%2bNS28%3d&risl=&pid=ImgRaw&r=0' },
    { id: 'cnn-chile-opc1', name: 'CNN Chile', url: `${IPTV_BASE}/576232.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWxWLCvtyoA7kEXrdQGpaRyAa0rueu3Y53xA&s' },
    { id: 'cnn-chile-opc2', name: 'CNN Chile OPC2', url: `${IPTV_BASE}/576233.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRWxWLCvtyoA7kEXrdQGpaRyAa0rueu3Y53xA&s' },
    { id: 'la-red-opc1', name: 'La Red', url: `${IPTV_BASE}/576307.ts`, logo: 'https://cdn.m3u.cl/logo/790_La_Red.png' },
    { id: 'la-red-opc2', name: 'La Red OPC2', url: `${IPTV_BASE}/576239.ts`, logo: 'https://cdn.m3u.cl/logo/790_La_Red.png' },
    { id: 'tv-plus-opc1', name: 'TV+', url: `${IPTV_BASE}/576256.ts`, logo: 'https://i.postimg.cc/nV3KBk4k/1.png' },
    { id: 'tv-plus-opc2', name: 'TV+ OPC2', url: `${IPTV_BASE}/576257.ts`, logo: 'https://i.postimg.cc/nV3KBk4k/1.png' },
    { id: 'chv-deportes', name: 'CHV Deportes', url: `${IPTV_BASE}/576511.ts`, logo: 'https://cdn.m3u.cl/logo/1569_CHV_Deportes.png' },
    { id: 'etc-tv-opc1', name: 'ETC TV', url: `${IPTV_BASE}/576235.ts`, logo: 'https://static.wikia.nocookie.net/logopedia/images/a/ac/Etc..._TV_1996.png/revision/latest/scale-to-width-down/1200?cb=20210515141955&path-prefix=es' },
    { id: 'via-x', name: 'Via X', url: `${IPTV_BASE}/576265.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSxK2tBw1GXi-ilCly1viA8NQgzft-7wvZZfQ&s' },
    { id: 'zona-latina', name: 'Zona Latina', url: `${IPTV_BASE}/598849.ts`, logo: 'https://th.bing.com/th/id/OIP.ML-0kUgxwd_E8zRTgprsoAHaHa?rs=1&pid=ImgDetMain&cb=idpwebpc2' },
    { id: 'rec13-opc1', name: 'Rec 13', url: `${IPTV_BASE}/576248.ts`, logo: 'https://i.postimg.cc/Yqt03K3K/1.png' },
    { id: 'ucv', name: 'UCV', url: `${IPTV_BASE}/576264.ts`, logo: 'https://i.postimg.cc/BvZ7J64Z/UCV-but-better-quality.png' },
    { id: 'bio-bio-tv', name: 'Bio Bio TV', url: `${IPTV_BASE}/576306.ts`, logo: 'https://cdn.m3u.cl/logo/421_Bio_Bio_TV.png' },
    { id: 'pinguino-tv', name: 'Pinguino TV', url: `${IPTV_BASE}/576244.ts`, logo: 'http://icomplay.net:80/images/SyQb0CSmjWAheouRMfZPMWGLYSwQ7tNfVCFn6v-jlF9dkxh9AnZxucBklRUSDMET.png' },
  ],

  // ==================== USA ====================
  'USA': [
    { id: 'us-cw', name: 'CW', url: `${IPTV_BASE}/588927.ts`, logo: 'https://i.ibb.co/ZV8CJtp/CM.jpg' },
    { id: 'us-freeform', name: 'Freeform', url: `${IPTV_BASE}/588929.ts`, logo: 'https://i.ibb.co/GVkBF66/FREEFORM.jpg' },
    { id: 'us-bravo', name: 'Bravo', url: `${IPTV_BASE}/673911.ts`, logo: 'http://stalkertvlatinoplay.com/LOGOS/USAENTERTAINMENT/BRAVO.png' },
    { id: 'us-e-entertainment', name: 'E! Entertainment', url: `${IPTV_BASE}/673917.ts`, logo: 'http://stalkertvlatinoplay.com/LOGOS/USAENTERTAINMENT/EENTERTAINMENT.png' },
    { id: 'us-lifetime', name: 'Lifetime', url: `${IPTV_BASE}/673923.ts`, logo: 'http://stalkertvlatinoplay.com/LOGOS/USAENTERTAINMENT/LIFETIME.png' },
    { id: 'us-tlc', name: 'TLC', url: `${IPTV_BASE}/673929.ts`, logo: 'http://stalkertvlatinoplay.com/LOGOS/USAENTERTAINMENT/TLC.png' },
    { id: 'us-hgtv', name: 'HGTV', url: `${IPTV_BASE}/673922.ts`, logo: 'http://stalkertvlatinoplay.com/LOGOS/USAENTERTAINMENT/HGTV.png' },
    { id: 'us-food-network', name: 'Food Network', url: `${IPTV_BASE}/673918.ts`, logo: 'http://stalkertvlatinoplay.com/LOGOS/USAENTERTAINMENT/FOODNETWORK.png' },
    { id: 'us-travel-channel', name: 'Travel Channel', url: `${IPTV_BASE}/673930.ts`, logo: 'http://stalkertvlatinoplay.com/LOGOS/USAENTERTAINMENT/TRAVELCHANNEL.png' },
    { id: 'us-own', name: 'OWN', url: `${IPTV_BASE}/673927.ts`, logo: 'http://stalkertvlatinoplay.com/LOGOS/USAENTERTAINMENT/OWN.png' },
    { id: 'us-bet', name: 'BET', url: `${IPTV_BASE}/576665.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRyVY5IlfQTSHLBxwbpeaz-_q86czk1w_RGAJ0FQGOYkeuNxdsq_-U7GA4OgcBXHB3pOSI&usqp=CAU' },
    { id: 'us-tv-land', name: 'TV Land', url: `${IPTV_BASE}/575932.ts`, logo: 'https://i.ibb.co/h2L0F06/Tvland.png' },
    { id: 'us-tv-one', name: 'TV One', url: `${IPTV_BASE}/575933.ts`, logo: 'https://i.ibb.co/9smjdZx/tvone.png' },
    { id: 'us-oxygen', name: 'Oxygen', url: `${IPTV_BASE}/576693.ts`, logo: 'http://dnslivetv.online:80/images/Kanmk96vTt-hjZj_mC4RcPttLMlmeeoOsTOSXqs4fWX3dO1LrqBN1k1_iMCELtN0dS7HgqoNTVt08fI93xETwvC7AA7_j6dPQuJFH9UIOYBWtZw2jW7lCQ2fBp0TxHTk.png' },
    { id: 'us-trutv', name: 'TruTV', url: `${IPTV_BASE}/673931.ts`, logo: 'http://stalkertvlatinoplay.com/LOGOS/USAENTERTAINMENT/TRUTV.png' },
    { id: 'us-court-tv', name: 'Court TV', url: `${IPTV_BASE}/576671.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ6NQsQPGCKy9xF_AQqBo-zsWsokMPI1szLVGMNGGPFNNXnU6Qdx2XyEhL4OCZ7OULJ22A&usqp=CAU' },
    { id: 'us-bbc-america', name: 'BBC America HD', url: `${IPTV_BASE}/576728.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjlM6DKe-wFk3YH-7blG6dm6Yq_7ehoufZbg&s' },
    { id: 'us-smithsonian', name: 'Smithsonian Channel', url: `${IPTV_BASE}/575926.ts`, logo: 'https://i.ibb.co/Kx4DPHf/Smithsonian.png' },
    { id: 'us-hln', name: 'HLN', url: `${IPTV_BASE}/588934.ts`, logo: 'https://i.ibb.co/p1G6psd/HLN.jpg' },
    { id: 'us-ahc', name: 'American Heroes Channel', url: `${IPTV_BASE}/588925.ts`, logo: 'https://i.ibb.co/BqmhyYk/AHC.jpg' },
    { id: 'us-destination-america', name: 'Destination America', url: `${IPTV_BASE}/673916.ts`, logo: 'http://stalkertvlatinoplay.com/LOGOS/USAENTERTAINMENT/DESTINATIONAMERICA.png' },
    { id: 'us-game-show-network', name: 'Game Show Network', url: `${IPTV_BASE}/673920.ts`, logo: 'http://stalkertvlatinoplay.com/LOGOS/USAENTERTAINMENT/GAMESHOWNETWORK.png' },
    { id: 'us-outdoor-channel', name: 'Outdoor Channel', url: `${IPTV_BASE}/673926.ts`, logo: 'http://stalkertvlatinoplay.com/LOGOS/USAENTERTAINMENT/OUTDOORCHANNEL.jpg' },
    { id: 'us-universo', name: 'Universo', url: `${IPTV_BASE}/673933.ts`, logo: 'http://stalkertvlatinoplay.com/LOGOS/USAENTERTAINMENT/UNIVERSO.png' },
  ],

  // ==================== PERU ====================
  'Peru': [
    { id: 'pe-america-tv-opc1', name: 'America TV', url: `${IPTV_BASE}/570895.ts`, logo: 'http://www.tmsimg.com/assets/s15389_ll_h3_ab.png' },
    { id: 'pe-america-tv-opc2', name: 'America TV OPC2', url: `${IPTV_BASE}/570900.ts`, logo: 'http://www.tmsimg.com/assets/s15389_ll_h3_ab.png' },
    { id: 'pe-atv-opc1', name: 'ATV', url: `${IPTV_BASE}/570906.ts`, logo: 'http://ceoapps.org/logos/atv.png' },
    { id: 'pe-atv-opc2', name: 'ATV OPC2', url: `${IPTV_BASE}/570911.ts`, logo: 'http://ceoapps.org/logos/atv.png' },
    { id: 'pe-atv-plus-opc1', name: 'ATV+', url: `${IPTV_BASE}/570918.ts`, logo: 'https://i.ibb.co/s9DXfML/ATV.png' },
    { id: 'pe-latina-opc1', name: 'Latina HD', url: `${IPTV_BASE}/570995.ts`, logo: 'https://elcomercio.pe/resizer/lSJS13pKkn0cX2OFSyuZqwRcXFg=/1200x1200/smart/filters:format(jpeg):quality(75)/cloudfront-us-east-1.images.arcpublishing.com/elcomercio/OMZVEA5IKFFTJJ3VVN3IP7ZVD4.jpg' },
    { id: 'pe-latina-opc2', name: 'Latina HD OPC2', url: `${IPTV_BASE}/895702.ts`, logo: 'https://elcomercio.pe/resizer/lSJS13pKkn0cX2OFSyuZqwRcXFg=/1200x1200/smart/filters:format(jpeg):quality(75)/cloudfront-us-east-1.images.arcpublishing.com/elcomercio/OMZVEA5IKFFTJJ3VVN3IP7ZVD4.jpg' },
    { id: 'pe-canal-n-opc1', name: 'Canal N', url: `${IPTV_BASE}/570939.ts`, logo: 'http://icomplay.net:80/images/QjSeU3keF4YpIALmJ3KE14sYDzvVchIHsdL8WFUI_7iEUQd8vq4KNv0JLJYgDKloSXDlXLA7HBNEACOq2UW-3w.png' },
    { id: 'pe-canal-n-opc2', name: 'Canal N OPC2', url: `${IPTV_BASE}/570940.ts`, logo: 'http://icomplay.net:80/images/QjSeU3keF4YpIALmJ3KE14sYDzvVchIHsdL8WFUI_7iEUQd8vq4KNv0JLJYgDKloSXDlXLA7HBNEACOq2UW-3w.png' },
    { id: 'pe-panamericana', name: 'Panamericana', url: `${IPTV_BASE}/571028.ts`, logo: 'http://ceoapps.org/logos/panamericanape.png' },
    { id: 'pe-tv-peru-opc1', name: 'TV Peru', url: `${IPTV_BASE}/571058.ts`, logo: 'http://icomplay.net:80/images/QjSeU3keF4YpIALmJ3KE1-kU2Y6NIHG2emYfb9QrgPPKmAkldqvSsCB49wuyHv_9.png' },
    { id: 'pe-tv-peru-opc2', name: 'TV Peru OPC2', url: `${IPTV_BASE}/571059.ts`, logo: 'http://icomplay.net:80/images/QjSeU3keF4YpIALmJ3KE1y7fS2BfKnqbXy9vixZZxGrXYue2OogFOGyjRDLRDAcB.png' },
    { id: 'pe-willax', name: 'Willax', url: `${IPTV_BASE}/571071.ts`, logo: 'http://ceoapps.org/logos/willax.png' },
    { id: 'pe-rpp-opc1', name: 'RPP', url: `${IPTV_BASE}/571048.ts`, logo: 'https://upload.wikimedia.org/wikipedia/commons/0/04/RPP_TV_-_2017_logo.png' },
    { id: 'pe-rpp-opc2', name: 'RPP HD', url: `${IPTV_BASE}/571047.ts`, logo: 'https://i.ibb.co/WVr4M6g/images-1.jpg' },
    { id: 'pe-global-tv', name: 'Global TV', url: `${IPTV_BASE}/570971.ts`, logo: 'http://icomplay.net:80/images/QjSeU3keF4YpIALmJ3KE1_iWrqJIeBdZq7I25O16N3BQMiJfiMzvdSqTFqKnPwcE.png' },
    { id: 'pe-exitosa', name: 'Exitosa', url: `${IPTV_BASE}/570965.ts`, logo: 'http://ceoapps.org/logos/exitosape.png' },
  ],

  // ==================== URUGUAY ====================
  'Uruguay': [
    { id: 'uy-canal4', name: 'Canal 4', url: `${IPTV_BASE}/571378.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRtXtxZA4e9JBulx8x5yBLGCMvFDK425ctrhA&s' },
    { id: 'uy-canal5', name: 'Canal 5 Uruguay', url: `${IPTV_BASE}/571384.ts`, logo: 'https://yt3.googleusercontent.com/eiZmM2rba1WWMJLJ8xzLtSZXJWlqjv-Ggsjm7AOtQqzjko7iWlaqDijWF7bgQayiH4vhkP4snw=s900-c-k-c0x00ffffff-no-rj' },
    { id: 'uy-canal10', name: 'Canal 10', url: `${IPTV_BASE}/571359.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcREHRa48CDD4gj62gk4f_Jz6CDyhptK7tQGVbXNL_JNvO45JJpFzaMLTpvPkBm33ub_9wc&usqp=CAU' },
    { id: 'uy-canal12', name: 'Canal 12', url: `${IPTV_BASE}/571367.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjapzz5uWveRASZpFI5Fofr3Xd54LleO0qdA&s' },
    { id: 'uy-tnu', name: 'TNU', url: `${IPTV_BASE}/571408.ts`, logo: 'https://i.imgur.com/911oGSv.png' },
    { id: 'uy-la-tele', name: 'La Tele', url: `${IPTV_BASE}/571398.ts`, logo: 'http://icomplay.net:80/images/QjSeU3keF4YpIALmJ3KE11I_RLtkmyV3XYAe78qJ9GZUQACyy6ileMXfEJvXrgxZ.png' },
    { id: 'uy-tv-ciudad', name: 'TV Ciudad', url: `${IPTV_BASE}/571411.ts`, logo: 'https://i.imgur.com/4mxJdpy.png' },
    { id: 'uy-la-red', name: 'La Red', url: `${IPTV_BASE}/571395.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcHr3hzI4YHaVSB9QNI-jXgvgMtyXHserX7XB0LwbeCR7bs7wSs_UR5vJcjqGBYuM_5ZU&usqp=CAU' },
    { id: 'uy-fish-tv', name: 'Fish TV', url: `${IPTV_BASE}/639589.ts`, logo: 'https://yt3.googleusercontent.com/ytc/AIdro_muIWNvKEOvujauv9jED_rl6q5O73J7gdbwp118VTbUQg=s900-c-k-c0x00ffffff-no-rj' },
    { id: 'uy-a-plus-v', name: 'A+V HD', url: `${IPTV_BASE}/571356.ts`, logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f8/CanalA%2BVUruguay2017.png' },
  ],

  // ==================== PARAGUAY ====================
  'Paraguay': [
    { id: 'py-telefuturo', name: 'Telefuturo', url: `${IPTV_BASE}/571346.ts`, logo: 'https://yt3.googleusercontent.com/1D-d0TjwChUBOrteOTQwx-WU-C50T9JtfniY2G27b7LDpLO7L5LYhOuE-mAbfdfp-gWZ3-x5NA=s900-c-k-c0x00ffffff-no-rj' },
    { id: 'py-snt', name: 'SNT', url: `${IPTV_BASE}/571335.ts`, logo: 'https://yt3.googleusercontent.com/0jKtNmh-YMht8d8hAt53OYhkQry-_Mv7GOVo13afOH9-8gMQ5IMppM_bjzLZdzIT0MkHmKpr=s900-c-k-c0x00ffffff-no-rj' },
    { id: 'py-rpc', name: 'RPC', url: `${IPTV_BASE}/571329.ts`, logo: 'https://i.ibb.co/VCDDGt0/rpc-3.png' },
    { id: 'py-unicanal', name: 'Unicanal', url: `${IPTV_BASE}/571354.ts`, logo: 'https://pbs.twimg.com/media/B_LGcF6WsAAZhPX.png' },
    { id: 'py-paraguay-tv', name: 'Paraguay TV', url: `${IPTV_BASE}/571316.ts`, logo: 'https://yt3.googleusercontent.com/ytc/AIf8zZRXOEqET6M7FZmTDS4cZ_MXET0voS8wMndWiIQs8Q=s900-c-k-c0x00ffffff-no-rj' },
    { id: 'py-npy', name: 'NPY', url: `${IPTV_BASE}/571315.ts`, logo: 'https://i.ibb.co/zHf8F2r/npy.png' },
    { id: 'py-noticias-py', name: 'Noticias PY', url: `${IPTV_BASE}/571312.ts`, logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/NPY_(Noticias_Paraguay).png/1200px-NPY_(Noticias_Paraguay).png' },
    { id: 'py-c9n', name: 'C9N', url: `${IPTV_BASE}/571302.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTN3kBOp2JD75So2qqzbz7S-z5NmScqsd5yfw&s' },
    { id: 'py-abc-tv', name: 'ABC TV', url: `${IPTV_BASE}/571295.ts`, logo: 'https://television.com.py/wp-content/uploads/2019/03/ABC-TV.png' },
    { id: 'py-gen', name: 'GEN', url: `${IPTV_BASE}/571305.ts`, logo: 'https://media.licdn.com/dms/image/C560BAQGAmmOdnNxk0Q/company-logo_200_200/0/1630659157739/somosgen_logo?e=2147483647&v=beta&t=DYLVulh4V_TiOw2NNS09NdMJlInTyeRx0UlUj32ofVk' },
    { id: 'py-la-tele', name: 'La Tele', url: `${IPTV_BASE}/571310.ts`, logo: 'https://i.ibb.co/BzkTzDD/la-tele.png' },
    { id: 'py-paravision', name: 'Paravision', url: `${IPTV_BASE}/571318.ts`, logo: 'https://www.paravision.com.py/img/paravision-logo.jpg' },
    { id: 'py-sur-tv', name: 'Sur TV', url: `${IPTV_BASE}/571340.ts`, logo: 'https://i.ibb.co/zN4WTqb/sur.png' },
  ],

  // ==================== ESPAÑA ====================
  'España': [
    { id: 'es-antena3', name: 'Antena 3 Internacional', url: `${IPTV_BASE}/300166.ts`, logo: 'https://imagenes.atresplayer.com/atp/clipping/cmsimages02/2018/02/22/6339206B-7A24-4601-B30D-501750FDFF7B//720x540.jpg' },
    { id: 'es-la1-opc1', name: 'La 1', url: `${IPTV_BASE}/582925.ts`, logo: 'https://image.roku.com/developer_channels/prod/526bd32045567521e38a5c1d33e776a55a60e0552ec3c22e79d064cc153a102f.png' },
    { id: 'es-la1-opc2', name: 'La 1 OPC2', url: `${IPTV_BASE}/582924.ts`, logo: 'https://image.roku.com/developer_channels/prod/526bd32045567521e38a5c1d33e776a55a60e0552ec3c22e79d064cc153a102f.png' },
    { id: 'es-cuatro', name: 'Cuatro', url: `${IPTV_BASE}/660304.ts`, logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSJWybYCDSg7tJbej4nByZjbWOKbc_UcbGQUg&s' },
    { id: 'es-mega', name: 'Mega', url: `${IPTV_BASE}/582923.ts`, logo: 'https://pbs.twimg.com/profile_images/1809497033092272128/IhEJs_Hn_400x400.jpg' },
    { id: 'es-axn', name: 'AXN', url: `${IPTV_BASE}/300167.ts`, logo: 'https://brandemia.org/sites/default/files/nuevo_logo_axn_2.jpg' },
    { id: 'es-bemad', name: 'BeMad HD', url: `${IPTV_BASE}/672145.ts`, logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/BeMad_Icon.svg/800px-BeMad_Icon.svg.png' },
    { id: 'es-telemadrid', name: 'Telemadrid', url: `${IPTV_BASE}/580940.ts`, logo: 'https://image.roku.com/developer_channels/prod/526bd32045567521e38a5c1d33e776a55a60e0552ec3c22e79d064cc153a102f.png' },
    { id: 'es-canal-sur', name: 'Canal Sur Andalucia', url: `${IPTV_BASE}/611670.ts`, logo: 'https://image.roku.com/developer_channels/prod/526bd32045567521e38a5c1d33e776a55a60e0552ec3c22e79d064cc153a102f.png' },
    { id: 'es-el-toro', name: 'El Toro TV', url: `${IPTV_BASE}/580961.ts`, logo: 'https://image.roku.com/developer_channels/prod/526bd32045567521e38a5c1d33e776a55a60e0552ec3c22e79d064cc153a102f.png' },
    { id: 'es-disney-channel', name: 'Disney Channel', url: `${IPTV_BASE}/580960.ts`, logo: 'https://image.roku.com/developer_channels/prod/526bd32045567521e38a5c1d33e776a55a60e0552ec3c22e79d064cc153a102f.png' },
    { id: 'es-disney-jr', name: 'Disney Jr', url: `${IPTV_BASE}/580958.ts`, logo: 'https://image.roku.com/developer_channels/prod/526bd32045567521e38a5c1d33e776a55a60e0552ec3c22e79d064cc153a102f.png' },
    { id: 'es-fdf', name: 'FDF', url: `${IPTV_BASE}/580937.ts`, logo: 'https://image.roku.com/developer_channels/prod/526bd32045567521e38a5c1d33e776a55a60e0552ec3c22e79d064cc153a102f.png' },
    { id: 'es-real-madrid-tv', name: 'Real Madrid TV HD', url: `${IPTV_BASE}/580964.ts`, logo: 'https://i.postimg.cc/3xT6JPLP/1.png' },
  ],
};

// Funcion para obtener todas las categorias
export const getCategories = () => Object.keys(channels);

// Funcion para buscar canales por nombre
export const searchChannels = (query) => {
  const results = [];
  const searchTerm = query.toLowerCase();

  Object.entries(channels).forEach(([category, channelList]) => {
    channelList.forEach(channel => {
      if (channel.name.toLowerCase().includes(searchTerm)) {
        results.push({ ...channel, category });
      }
    });
  });

  return results;
};

// Funcion para obtener un canal por ID
export const getChannelById = (id) => {
  for (const [category, channelList] of Object.entries(channels)) {
    const channel = channelList.find(c => c.id === id);
    if (channel) {
      return { ...channel, category };
    }
  }
  return null;
};
