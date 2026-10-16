'use strict';
// ================= WORLD MANIFEST =================
// Every world (and DLC) is one script that calls defWorld({...}) - see js/scenes.js for the shape.
// Add a world:  1) write worlds/wN.js (copy w2.js as a template)  2) drop its art in hd/ (or set artBase)
//               3) add a line below. Warp nodes {k:'warp',to:N,at:nodeId} link maps; unknown worlds show COMING SOON.
// DLC: put it in its own folder, e.g. dlc/<name>/world.js with artBase:'bigfoot-bound-assets/dlc/<name>/', and add {dlc:1}.
const MANIFEST=[
 {id:1,name:'BIGFOOT VALLEY',file:'worlds/w1.js'},
 {id:2,name:'FROSTBITE PEAKS',file:'worlds/w2.js'},
];
