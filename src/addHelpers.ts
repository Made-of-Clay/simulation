import { AxesHelper, GridHelper } from 'three';
import { getScene } from './getScene';
import { getGui } from './getGui';

export function addHelpers() {
    const scene = getScene();
    const gui = getGui();
    const helpersFolder = gui.addFolder('Helpers');

    const axesHelper = new AxesHelper(4);
    axesHelper.visible = false;
    scene.add(axesHelper);
    helpersFolder.add(axesHelper, 'visible').name('Axes');

    const gridHelper = new GridHelper(20, 20, 'teal', 'darkgray');
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);
    helpersFolder.add(gridHelper, 'visible').name('Grid');
}
