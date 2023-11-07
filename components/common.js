import { fetchTle, southEastZenithToAzEl } from "satsim";
import { defined, Color, Cartesian3 } from "cesium";


async function loadSatellites(universe, viewer, url, linesPerTle=3, showPath=false) { 
  await fetchTle(url, linesPerTle, (line1, line2, line3) => {
    if(universe.hasObject(line1))
      return;
    const satellite = universe.addSGP4Satellite(line1, line2, line3, 'nadir', true);
    const description = `<div><b>${line1}</b><br><br>${line2}<br>${line3}<br><br>Period: ${(satellite.period / 60).toFixed(2)} min<br><br></div>`;
    const color = new Color.fromRandom({alpha: 1.0});
    viewer.addObjectVisualizer(satellite, description, {
      path: {
        show: showPath,
        leadTime: satellite.period / 2,
        trailTime: satellite.period / 2,
        resolution: satellite.period / (500 / (1 - satellite.eccentricity)), // make eliptical orbits look better
        material: color,
        width: 1      
      },
      point: { 
        pixelSize: Math.random() * 3 + 2,
        color: color,
        outlineColor: color,
        show: true
      }
    });
  });
}

async function loadSensors(universe, viewer, url) {
  const response = await fetch(url);
  const json = await response.json();
  for (let i = 0; i < json.length; i++) {
    const obs = json[i]
    const o = universe.addGroundElectroOpticalObservatory(obs.name, obs.latitude, obs.longitude, obs.altitude, 'AzElGimbal', obs.height, obs.width, obs.y_fov, obs.x_fov, obs.field_of_regard);
    const description = `<div><b>${o.site.name}</b><br><br>Latitude: ${o.site.latitude} deg<br>Longitude: ${o.site.longitude} deg<br>Altitude: ${o.site.altitude} m<br><br></div>`;
    viewer.addObservatoryVisualizer(o, description);
    o.gimbal.trackMode = 'rate';
  }
}

function randomTrack(universe, observatory, time, maxIterations=500) {
  showTrackedPath(observatory.gimbal, false);
  const numTrackables = universe._trackables.length;
  if(numTrackables === 0) {
    return;
  }
  const localPos = new Cartesian3();
  while(true) {
    let ob = universe._trackables[Math.floor(Math.random() * numTrackables)];
    if(defined(ob)) {
      observatory.site.transformPointFromWorld(ob.worldPosition, localPos);
      let [az, el, r] = southEastZenithToAzEl(localPos)
      if(ob.period < 2000 * 60 && el > 30) {
        observatory.gimbal.trackObject = ob;
        observatory.gimbal.update(time, universe);
        break;
      } else if(maxIterations < 0) {
        break;
      }
    }
    maxIterations--;
  }
  showTrackedPath(observatory.gimbal, true);
}

function showTrackedPath(gimbal, show) {
  if(defined(gimbal.trackObject)) {
    if(defined(gimbal.trackObject.visualizer)) {
      if(defined(gimbal.trackObject.visualizer.path)) {
        gimbal.trackObject.visualizer.path.show = show;
      }
    }
  }
}


export {
  loadSatellites,
  loadSensors,
  randomTrack,
  showTrackedPath
}