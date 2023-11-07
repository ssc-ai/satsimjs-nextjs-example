import { defined, JulianDate } from 'cesium'
import { useRef, useEffect, useState } from 'react';
import { Viewer } from 'resium'
import { Universe, mixinViewer } from 'satsim';
import { loadSatellites, loadSensors, randomTrack } from './common.js';

function main(universe, viewer) {
    // track something    
    universe.update(viewer.clock.currentTime);
    universe._observatories.forEach((o) => {
      randomTrack(universe, o, viewer.clock.currentTime);
    });

    // random track
    const lastTrackTime = new JulianDate();
    viewer.scene.preUpdate.addEventListener((scene, time) => {
      if(Math.abs(JulianDate.secondsDifference(lastTrackTime, time)) > 15) {
        const observatories = universe._observatories;
        randomTrack(universe, observatories[Math.floor(Math.random() * observatories.length)], time);
        JulianDate.clone(time, lastTrackTime);   
      }
    });
}

export default function Cesium() {
  const [flag, setFlag] = useState(false);
  const ref = useRef(null);

  /**
   * Delete the universe and viewer references.
   */
  function clearEffect() {
    console.log('clearEffect called');
    //possibly in the future, we can use this to clean up the universe and viewer
  }

  /**
   * Initialize the universe and viewer references.
   */
  useEffect(() => {

    console.log('useEffect called');
    if (ref.current && ref.current.cesiumElement) {

      // init satsim universe and mixin satsim viewer
      if (!defined(ref.current.cesiumElement.satsimUniverse)) { // check if the satsim universe has already been created
        ref.current.cesiumElement.satsimUniverse = new Universe(); // set a reference to the universe in the viewer to determine later if it has been initialized
        const universe = ref.current.cesiumElement.satsimUniverse;
        const viewer = mixinViewer(ref.current.cesiumElement, universe, {
          showWeatherLayer: false,
          showNightLayer: false,
        });

        // async calls can be done here, but may fail on first call in strict dev mode
        loadSensors(universe, viewer, '/sites.json')
          .then(() => {
            loadSatellites(universe, viewer, '/celestrak_sat_elem.txt')
              .then(() => {

                // main function
                console.log('load complete, calling main');
                main(universe, viewer);

              })
              .catch((error) => {
                // error may be thrown in strict dev mode because viewer is destroyed during loading
                console.log('satellite load failed, possibliy due to strict dev mode');
              });
            })
          .catch((error) => {
              // error may be thrown in strict dev mode because viewer is destroyed during loading
              console.log('sensor load failed, possibliy due to strict dev mode');
          });
      }
    }
    return clearEffect;    

  }, []);

  return (
    <Viewer full ref={ref}>
    </Viewer>
  )
}
