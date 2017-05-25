'use strict';

(function() {
  var Marzipano = window.Marzipano;
  var bowser = window.bowser;
  var screenfull = window.screenfull;
  var APP_DATA = window.APP_DATA;
  var DATA_SWITCH_SCENES = window.DATA_SWITCH_SCENES;

  // Grab elements from DOM.
  var panoElement = document.querySelector('#pano');
  var sceneNameElement = document.querySelector('#titleBar .sceneName');
  var sceneListElement = document.querySelector('#sceneList');
  var sceneElements = document.querySelectorAll('#sceneList .scene');
  var sceneListToggleElement = document.querySelector('#sceneListToggle');
  var autorotateToggleElement = document.querySelector('#autorotateToggle');
  var fullscreenToggleElement = document.querySelector('#fullscreenToggle');

  var checkSwitch = false;

  // Detect desktop or mobile mode.
  if (window.matchMedia) {
    var setMode = function() {
      if (mql.matches) {
        document.body.classList.remove('desktop');
        document.body.classList.add('mobile');
      } else {
        document.body.classList.remove('mobile');
        document.body.classList.add('desktop');
      }
    };
    var mql = matchMedia("(max-width: 500px), (max-height: 500px)");
    setMode();
    mql.addListener(setMode);
  } else {
    document.body.classList.add('desktop');
  }

  // Detect whether we are on a touch device.
  document.body.classList.add('no-touch');
  window.addEventListener('touchstart', function() {
    document.body.classList.remove('no-touch');
    document.body.classList.add('touch');
  });

  // Use tooltip fallback mode on IE < 11.
  if (bowser.msie && parseFloat(bowser.version) < 11) {
    document.body.classList.add('tooltip-fallback');
  }

  // Viewer options.
  var viewerOpts = {
    controls: {
      mouseViewMode: APP_DATA.settings.mouseViewMode
    }
  };

  // Initialize viewer.
  var viewer = new Marzipano.Viewer(panoElement, viewerOpts);

  // Setup autorotate.
  var autorotate = Marzipano.autorotate({ yawSpeed: 0.1, targetPitch: 0, targetFov: Math.PI/2 });
  if (APP_DATA.settings.autorotateEnabled) {
    autorotateToggleElement.classList.add('enabled');
  }

  // Create scenes.
  var scenes = APP_DATA.scenes.map(function(sceneData) {
    var source = Marzipano.ImageUrlSource.fromString(
      "tiles/" + sceneData.id + "/{z}/{f}/{y}/{x}.jpg",
      { cubeMapPreviewUrl: "tiles/" + sceneData.id + "/preview.jpg" });
    var geometry = new Marzipano.CubeGeometry(sceneData.levels);

    var limiter = Marzipano.RectilinearView.limit.traditional(sceneData.faceSize, 100*Math.PI/180, 120*Math.PI/180);
    var view = new Marzipano.RectilinearView(sceneData.initialViewParameters, limiter);

    var marzipanoScene = viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: true
    });

    // Create link hotspots.
    sceneData.linkHotspots.forEach(function(hotspot) {
      var element = createLinkHotspotElement(hotspot);
      marzipanoScene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // Create hint hotspots.
    sceneData.hintHotspots.forEach(function(hotspot) {
      var element = createHintHotspotElement(hotspot);
      marzipanoScene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // Create info hotspots.
    sceneData.infoHotspots.forEach(function(hotspot) {
      var element = createInfoHotspotElement(hotspot);
      marzipanoScene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });
    
    // Create embedded hotspots.
    sceneData.embeddedHotsports.forEach(function(hotspot) {
      var element = createEmbeddedHotspotElement();
      var container = marzipanoScene.hotspotContainer(); 
      marzipanoScene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch}, 
        { perspective: { radius: hotspot.radius, extraRotations: "rotateY(" + hotspot.rotateY + "deg) rotateX(" + hotspot.rotateX + "deg)" }});
      container.createHotspot(document.getElementById('iframeselect'), { yaw: hotspot.frame_yaw, pitch: hotspot.frame_pitch });
    });

    return {
      data: sceneData,
      marzipanoObject: marzipanoScene
    };
  });

  // Display the initial scene.
  switchScene(scenes[0]);

  // Set handler for autorotate toggle.
  autorotateToggleElement.addEventListener('click', toggleAutorotate);

  // Check if fullscreen is supported and enable it if so
  if (screenfull.enabled && APP_DATA.settings.fullscreenButton) {
    document.body.classList.add('fullscreen-enabled');
    fullscreenToggleElement.addEventListener('click', toggleFullscreen);
  } else {
    document.body.classList.add('fullscreen-disabled');
  }

  // Set handler for scene list toggle.
  sceneListToggleElement.addEventListener('click', toggleSceneList);

  // Start with the scene list open on desktop.
  if (!document.body.classList.contains('mobile')) {
    //showSceneList();
  }

  // Set handler for scene switch.
  scenes.forEach(function(scene) {
    var el = document.querySelector('#sceneList .scene[data-id="' + scene.data.id + '"]');
    el.addEventListener('click', function() {
      switchScene(scene);
      // On mobile, hide scene list after selecting a scene.
      if (document.body.classList.contains('mobile')) {
        hideSceneList();
      }
    });
    el.addEventListener
  });

  // DOM elements for view controls.
  var viewUpElement = document.querySelector('#viewUp');
  var viewDownElement = document.querySelector('#viewDown');
  var viewLeftElement = document.querySelector('#viewLeft');
  var viewRightElement = document.querySelector('#viewRight');
  var viewInElement = document.querySelector('#viewIn');
  var viewOutElement = document.querySelector('#viewOut');

  // Dynamic parameters for controls.
  var velocity = 0.7;
  var friction = 3;

  // Associate view controls with elements.
  var controls = viewer.controls();
  controls.registerMethod('upElement',    new Marzipano.ElementPressControlMethod(viewUpElement,     'y', -velocity, friction), true);
  controls.registerMethod('downElement',  new Marzipano.ElementPressControlMethod(viewDownElement,   'y',  velocity, friction), true);
  controls.registerMethod('leftElement',  new Marzipano.ElementPressControlMethod(viewLeftElement,   'x', -velocity, friction), true);
  controls.registerMethod('rightElement', new Marzipano.ElementPressControlMethod(viewRightElement,  'x',  velocity, friction), true);
  controls.registerMethod('inElement',    new Marzipano.ElementPressControlMethod(viewInElement,  'zoom', -velocity, friction), true);
  controls.registerMethod('outElement',   new Marzipano.ElementPressControlMethod(viewOutElement, 'zoom',  velocity, friction), true);

  function sanitize(s) {
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;');
  }

  // this is test to find yaw and pitch
  function switchScene(scene) {
    stopAutorotate();
    scene.marzipanoObject.switchTo();
    startAutorotate();
    updateSceneName(scene);
    updateSceneList(scene);
  }

  function updateSceneName(scene) {
    sceneNameElement.innerHTML = sanitize(scene.data.name);
  }

  function updateSceneList(scene) {
    for (var i = 0; i < sceneElements.length; i++) {
      var el = sceneElements[i];
      if (el.getAttribute('data-id') === scene.data.id) {
        el.classList.add('current');
      } else {
        el.classList.remove('current');
      }
    }
  }

  function showSceneList() {
    sceneListElement.classList.add('enabled');
    sceneListToggleElement.classList.add('enabled');
  }

  function hideSceneList() {
    sceneListElement.classList.remove('enabled');
    sceneListToggleElement.classList.remove('enabled');
  }

  function toggleSceneList() {
    sceneListElement.classList.toggle('enabled');
    sceneListToggleElement.classList.toggle('enabled');
  }

  function startAutorotate() {
    if (!autorotateToggleElement.classList.contains('enabled')) {
      return;
    }
    viewer.startMovement(autorotate);
    viewer.setIdleMovement(3000, autorotate);
  }

  function stopAutorotate() {
    viewer.stopMovement();
    viewer.setIdleMovement(Infinity);
  }

  function toggleAutorotate() {
    if (autorotateToggleElement.classList.contains('enabled')) {
      autorotateToggleElement.classList.remove('enabled');
      stopAutorotate();
    } else {
      autorotateToggleElement.classList.add('enabled');
      startAutorotate();
    }
  }

  function toggleFullscreen() {
    screenfull.toggle();
    if (screenfull.isFullscreen) {
      fullscreenToggleElement.classList.add('enabled');
    } else {
      fullscreenToggleElement.classList.remove('enabled');
    }
  }

  function createLinkHotspotElement(hotspot) {

    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('link-hotspot');

    // Create image element.
    var icon = document.createElement('img');
    icon.src = 'img/link.png';
    icon.classList.add('link-hotspot-icon');

    // Set rotation transform.
    var transformProperties = [ '-ms-transform', '-webkit-transform', 'transform' ];
    for (var i = 0; i < transformProperties.length; i++) {
      var property = transformProperties[i];
      icon.style[property] = 'rotate(' + hotspot.rotation + 'rad)';
    }

    // Add click event handler.
    wrapper.addEventListener('click', function() {
      switchScene(findSceneById(hotspot.target));
    });

    // Prevent touch and scroll events from reaching the parent element.
    // This prevents the view control logic from interfering with the hotspot.
    stopTouchAndScrollEventPropagation(wrapper);

    // Create tooltip element.
    var tooltip = document.createElement('div');
    tooltip.classList.add('hotspot-tooltip');
    tooltip.classList.add('link-hotspot-tooltip');
    tooltip.innerHTML = findSceneDataById(hotspot.target).name;

    wrapper.appendChild(icon);
    wrapper.appendChild(tooltip);

    return wrapper;
  }

  function createInfoHotspotElement(hotspot) {

    //alert("running");

    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement('div');
    wrapper.classList.add('hotspot');
    wrapper.classList.add('info-hotspot');

    // Create hotspot/tooltip header.
    var header = document.createElement('div');
    header.classList.add('info-hotspot-header');

    // Create image element.
    var iconWrapper = document.createElement('div');
    iconWrapper.classList.add('info-hotspot-icon-wrapper');
    var icon = document.createElement('img');
    icon.src = 'img/info.png';
    icon.classList.add('info-hotspot-icon');
    iconWrapper.appendChild(icon);

    // Create title element.
    var titleWrapper = document.createElement('div');
    titleWrapper.classList.add('info-hotspot-title-wrapper');
    var title = document.createElement('div');
    title.classList.add('info-hotspot-title');
    title.innerHTML = hotspot.title;
    titleWrapper.appendChild(title);

    // Create close element.
    var closeWrapper = document.createElement('div');
    closeWrapper.classList.add('info-hotspot-close-wrapper');
    var closeIcon = document.createElement('img');
    closeIcon.src = 'img/close.png';
    closeIcon.classList.add('info-hotspot-close-icon');
    closeWrapper.appendChild(closeIcon);

    // Construct header element.
    header.appendChild(iconWrapper);
    header.appendChild(titleWrapper);
    header.appendChild(closeWrapper);

    // Create text element.
    var text = document.createElement('div');
    text.classList.add('info-hotspot-text');
    text.innerHTML = hotspot.text;

    // Place header and text into wrapper element.
    wrapper.appendChild(header);
    wrapper.appendChild(text);

    // Create a modal for the hotspot content to appear on mobile mode.
    var modal = document.createElement('div');
    modal.innerHTML = wrapper.innerHTML;
    modal.classList.add('info-hotspot-modal');
    document.body.appendChild(modal);

    var toggle = function() {
      wrapper.classList.toggle('visible');
      modal.classList.toggle('visible');
    };

    
    if(checkSwitch) {
      wrapper.classList.toggle('visible');
      modal.classList.toggle('visible');
    }

    // Show content when hotspot is clicked.
    wrapper.querySelector('.info-hotspot-header').addEventListener('click', toggle);

    // Hide content when close icon is clicked.
    modal.querySelector('.info-hotspot-close-wrapper').addEventListener('click', toggle);

    // Prevent touch and scroll events from reaching the parent element.
    // This prevents the view control logic from interfering with the hotspot.
    stopTouchAndScrollEventPropagation(wrapper);

    return wrapper;
  }

  function createEmbeddedHotspotElement(hotspot) {

    // HTML sources.
    var hotspotHtml = {
      youtube: '<iframe width="1800" height="1900" src="https://www.youtube.com/embed/onaE2mPv_Js" frameborder="0" allowfullscreen></iframe>',
      youtubeWithControls: '<iframe width="1800" height="1900" src="https://www.youtube.com/embed/g0AYnMPkg2k" frameborder="0" allowfullscreen></iframe>',
      googleMaps: '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d7836.47610974432!2d106.79560527319562!3d10.869489955414634!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x317527587ba04377%3A0x4ea5c6ca79f1ff59!2sUniversity+Of+Information+Technology!5e0!3m2!1sen!2s!4v1494176176883" width="1800" height="1900" frameborder="0" style="border:0" allowfullscreen></iframe>'
    };

    // Create wrapper element to hold icon and tooltip.
    var wrapper = document.createElement('div');
    wrapper.id = 'iframespot';

    // Create hotspot/tooltip header.
    var header = document.createElement('div');
    header.classList.add('message');
    header.innerHTML = "Chọn kênh nội dung trình chiếu!";

    // Create iframeselect
    var iframeselect = document.createElement('ul');
    iframeselect.id = 'iframeselect';

    var content_data_source = new Array("googleMaps", "youtube", "youtubeWithControls");
    var text_array = new Array("googleMaps", "youtube", "youtube (UI)");

    for(var i = 0; i < 3; i++) {
        var select = document.createElement('li');
        select.setAttribute('data-source', content_data_source[i]);
        select.innerHTML = text_array[i];
        iframeselect.appendChild(select);
    }

    // Construct header element.
    wrapper.appendChild(header);

    // Create a modal for the hotspot content to appear on mobile mode.
    document.body.appendChild(wrapper);
    document.body.appendChild(iframeselect);

    var switchElements = document.querySelectorAll('[data-source]');
    for (var i = 0; i < switchElements.length; i++) {
    var element = switchElements[i];
    addClickEvent(element);
    }

    // Switch sources when clicked.
    function switchHotspot(id) {
      var wrapper = document.getElementById('iframespot');
      wrapper.innerHTML = hotspotHtml[id];
    }

    function addClickEvent(element) {
      element.addEventListener('click', function() {
      switchHotspot(element.getAttribute('data-source'));
    });

  }

    return wrapper;
  }

  function createHintHotspotElement(hotspot) {

    var hotspot_css = document.createElement('link');
    hotspot_css.rel = 'stylesheet';
    hotspot_css.href = 'hotspot_css/tooltip.css';

    document.head.appendChild(hotspot_css);

    var wrapper = document.createElement('div');
    wrapper.id = 'tooltip';

    var animationOut = document.createElement('div');
    animationOut.classList.add('out');

    var animationIn = document.createElement('div');
    animationIn.classList.add('in');

    var image = document.createElement('div');
    image.classList.add('image');

    wrapper.appendChild(animationOut);
    animationOut.appendChild(animationIn);
    animationIn.appendChild(image);

    var tip = document.createElement('div');
    tip.classList.add('tip');

    var title = document.createElement('p');
    title.innerHTML = 'Truy cập trang chủ';

    var img = document.createElement('img');
    img.src = 'img/img_cntt.png';

    wrapper.appendChild(tip);
    tip.appendChild(title);
    tip.appendChild(img);

    wrapper.querySelector('.out').addEventListener('click', function() {
      window.open('http://uit.edu.vn/');
    });

    wrapper.querySelector('.image').addEventListener('click', function() {
      window.open('http://uit.edu.vn/');
    });

    return wrapper;
  }

  // Prevent touch and scroll events from reaching the parent element.
  function stopTouchAndScrollEventPropagation(element, eventList) {
    var eventList = [ 'touchstart', 'touchmove', 'touchend', 'touchcancel',
                      'wheel', 'mousewheel' ];
    for (var i = 0; i < eventList.length; i++) {
      element.addEventListener(eventList[i], function(event) {
        event.stopPropagation();
      });
    }
  }

  function findSceneById(id) {
    for (var i = 0; i < scenes.length; i++) {
      if (scenes[i].data.id === id) {
        return scenes[i];
      }
    }
    return null;
  }

  function findSceneDataById(id) {
    for (var i = 0; i < APP_DATA.scenes.length; i++) {
      if (APP_DATA.scenes[i].id === id) {
        return APP_DATA.scenes[i];
      }
    }
    return null;
  }

  function findUserDataById(id) {
    for (var i = 0; i < DATA_SWITCH_SCENES.user.length; i++) {
      if (DATA_SWITCH_SCENES.user[i].id === id) {
        return DATA_SWITCH_SCENES.user[i];
      }
    }
    return null;
  }

  // This is swith scenes by 10 second for the preview
  var user = findUserDataById("hoc-sinh");
  var sceneIndex = 1;  

  var auto = autoSwitch();
  function autoSwitch() {
    checkSwitch = true;

    var autoSwithScene = setInterval(function() {
      if (sceneIndex == user.scenes.length) {
        switchScene(scenes[0]);
        sceneIndex = 0;
        AutoScreenClick();
      }
      
      var sceneX = findSceneById(user.scenes[sceneIndex].id);
      switchScene(findSceneById(user.scenes[sceneIndex].id),2000);
        sceneIndex ++;
    }, 10000);

    return autoSwithScene;
  }

  function stopAutoSwitchScene() {
    checkSwitch = false;
    clearInterval(auto);
  }

  var player = document.querySelector('player');

  player.play();

  // You can turn on or off function play music
  var autoMusic = document.querySelector('#autoMusic');
  var autoScreen = document.querySelector('#autoScreen');
  autoMusic.addEventListener('click', AutoMusicClick);
  function AutoMusicClick() {
      if(autoMusic.classList.contains('enabled'))
      {
          autoMusic.classList.remove('enabled');
          // gọi hàm tắt âm thanh
          player.pause();
      }
      else
      {
          autoMusic.classList.add('enabled');
          // gọi hàm bật âm thanh
          player.play();
      }
  }
  
  // You can turn on or of function switch sence
  autoScreen.addEventListener('click', AutoScreenClick);
  function AutoScreenClick() {
      if (autoScreen.classList.contains('enabled')) {
          autoScreen.classList.remove('enabled');
          // gọi hàm tắt chuyển cảnh
          stopAutoSwitchScene();
      }
      else {
          autoScreen.classList.add('enabled');
          // gọi hàm bật chuyển cảnh
          auto = autoSwitch();
      }
  }


})();
