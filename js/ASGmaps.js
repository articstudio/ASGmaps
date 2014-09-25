/* ASGmaps 1.2 | MIT License */

/* GMAPS LOADER */
window.ASGmaps_Gmaps_Load = function()
{
    if (typeof window.ASGmaps !== 'object')
    {
        return false;
    }
    if (window.ASGmaps.loaded || (typeof google === 'object' && typeof google.maps === 'object'))
    {
        return window.ASGmaps_Gmaps_Callback();
    }
    var s = document.createElement('script');
    s.setAttribute('type', 'text/javascript');
    s.setAttribute('src', 'http://maps.google.com/maps/api/js?sensor=false&callback=ASGmaps_Gmaps_Callback');
    (document.getElementsByTagName('head')[0] || document.documentElement).appendChild(s);
};
window.ASGmaps_Gmaps_Callback = function()
{
    if (typeof window.ASGmaps !== 'object')
    {
        return false;
    }
    return window.ASGmaps.init();
};

/* FACTORY */
var ASGmaps_Factory = function()
{};
ASGmaps_Factory.prototype = {
    constructor: ASGmaps_Factory,
    debug: true,
    debug_type: 'console',
    loaded: false,
    geocoder: null,
    map_class_selector: 'map',
    maps: [],
    resizeListener: null,
    
    loadGmaps: function()
    {
        (this.loaded ? this.init() : window.ASGmaps_Gmaps_Load());
    },
    init: function()
    {
        if (!this.loaded)
        {
            this.loaded = true;
            
            this.geocoder = new google.maps.Geocoder();
            
            var mapElements = document.getElementsByClassName(this.map_class_selector);
            var n_mapElements = mapElements.length;
            
            if (n_mapElements > 0)
            {
                var i_mapElements;
                for (i_mapElements=0; i_mapElements < n_mapElements; ++i_mapElements)
                {
                    this.addMap(mapElements[i_mapElements], i_mapElements);
                    
                }
                
                var factory = this;
                this.resizeListener = google.maps.event.addDomListener(window, 'resize', function(){
                    var l = factory.maps.length;
                    if (l>0)
                    {
                        var i;
                        for (i=0; i<l; ++i)
                        {
                            factory.maps[i].resize();
                        }
                    }
                });
            }

            return true;
        }
    },
    
    addMap: function(element, index)
    {
        var o = new ASGmaps_Map(element);
        (o.init() ? this.maps[index] = o : this.debugMessage("Map can't initalize", o.element.id, 'error'));
    },
    
    debugMessage: function(message, id, type)
    {
        type = ('string' !== typeof type) ? 'message' : type;
        id = ('string' !== typeof id) ? '-' : id;
        message = ('string' !== typeof message) ? '' : message;
        if (message !== '' && this.debug)
        {
            var debug_message = 'ASGmaps ' + type + ': ' + message + ' (' + id + ')';
            if (this.debug_type === 'alert')
            {
                alert(debug_message);
            }
            else
            {
                console.log(debug_message);
            }
        }
    },
    
    ajaxCall: function(url, callbackDone, callbackError)
    {
        var xmlhttp = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
        
        xmlhttp.onreadystatechange = function()
        {
            if (xmlhttp.readyState === 4)
            {
                if(xmlhttp.status === 200)
                {
                    if (typeof callbackDone === 'function')
                    {
                        callbackDone(xmlhttp.responseText);
                    }
                }
                else
                {
                    if (typeof callbackError === 'function')
                    {
                        callbackError();
                    }
                }
            }
        };
        
        xmlhttp.open('GET', url, true);
        xmlhttp.send();
    },
    
    isJSON: function(str)
    {
        try
        {
            var o = JSON.parse(str);
            if (o && typeof o === 'object' && o !== null)
            {
                return o;
            }
        }
        catch(e)
        {}
        return false;
    },
    
    cloneObject: function(obj)
    {
        if (null === obj || "object" !== typeof obj)
        {
            return obj;
        }
        var copy = obj.constructor();
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr))
            {
                copy[attr] = obj[attr];
            }
        }
        return copy;
    },
    mergeObjects: function(o1, o2)
    {
        o1 = (typeof o1 === 'object') ? o1 : {};
        o2 = (typeof o2 === 'object') ? o2 : {};
        var o3 = this.cloneObject(o1);
        var opt;
        for (opt in o2)
        {
            o3[opt] = o2[opt];
        }
        return o3;
    },
    
    decodeHtmlEntity: function(str)
    {
        return str.replace(/&#(\d+);/g, function(match, dec) {
          return String.fromCharCode(dec);
        });
    },
    encodeHtmlEntity: function(str)
    {
        var buf = [];
        for (var i=str.length-1;i>=0;i--) {
          buf.unshift(['&#', str[i].charCodeAt(), ';'].join(''));
        }
        return buf.join('');
    }
};

/* MAP */
var ASGmaps_Map = function(element, options)
{
    this.element = element;
    this.options = options;
};
ASGmaps_Map.prototype = {
    constructor: ASGmaps_Map,
    options: null,
    element: null,
    map: null,
    bounds: null,
    fitMarkers: false,
    icon: null,
    markers: [],
    error: false,
    init: function()
    {
        var options = window.ASGmaps.mergeObjects(this.getDefaultOptions(), this.options);
        this.map = new google.maps.Map(this.element, this.sanitizeGmapOptions(options));
        this.bounds = new google.maps.LatLngBounds();
        this.error = !(this.putDefaultCenter() || this.putDefaultAddress());
        if (!this.error)
        {
            this.putDefaultZoom();
            var icon = this.getElementData('icon');
            if ('object' === typeof icon)
            {
                this.icon = icon;
            }
            this.fitMarkers = Boolean(this.getElementData('fitMarkers'));
            this.putDefaultMarkers();
        }
        return !this.error;
    },
    
    resize: function()
    {
        var center = this.map.getCenter();
        google.maps.event.trigger(this.map, 'resize');
        this.map.setCenter(center);
    },
    
    getDefaultGmapOptions: function()
    {
        return {
            zoom: 8,
            streetViewControl: false,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            mapTypeControl: true,
            mapTypeControlOptions: {
                style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
            },
            panControl: true,
            zoomControl: true,
            zoomControlOptions: {
                style: google.maps.ZoomControlStyle.SMALL
            }
        };
    },
    sanitizeGmapOptions: function(options)
    {
        options = (typeof options === 'object') ? options : {};
        var defaultOptions = this.getDefaultGmapOptions();
        return window.ASGmaps.mergeObjects(defaultOptions, options);
    },
    
    getDefaultOptions: function()
    {
        return this.getElementData('options');
    },
    setDefaultOptions: function(newOptions)
    {
        return this.setElementData('options', newOptions);
    },
    
    getDefaultCenter: function()
    {
        return this.getElementData('geolocation');
    },
    setDefaultCenter: function(newCenter)
    {
        return this.setElementData('geolocation', newCenter);
    },
    putDefaultCenter: function()
    {
        var geo = this.getDefaultCenter();
        if (geo !== '')
        {
            geo = geo.split(',');
            this.map.setCenter(new google.maps.LatLng(parseFloat(geo[0]), parseFloat(geo[1])));
            return true;
        }
        return false;
    },
    
    getDefaultMarkers: function()
    {
        return this.getElementData('markers');
    },
    setDefaultMarkers: function(newMarkers)
    {
        return this.setElementData('markers', newMarkers);
    },
    putDefaultMarkers: function()
    {
        var markers = this.getDefaultMarkers();
        if (typeof markers === 'object')
        {
            var l = markers.length;
            if (l>0)
            {
                var i;
                for (i=0; i<l; ++i)
                {
                    this.addMarker(markers[i]);
                }
            }
            return true;
        }
        return false;
    },
    
    getDefaultAddress: function()
    {
        return this.getElementData('address');
    },
    setDefaultAddress: function(newAddress)
    {
        return this.setElementData('address', newAddress);
    },
    putDefaultAddress: function()
    {
        var address = this.getDefaultAddress();
        if (address !== '')
        {
            var map = this.map;
            window.ASGmaps.geocoder.geocode(
                {'address': address},
                function(results, status)
                {
                    if (status === google.maps.GeocoderStatus.OK)
                    {
                        map.setCenter(results[0].geometry.location);
                    }
                }
            );
            return true;
        }
        return false;
    },
    
    getDefaultZoom: function()
    {
        return this.getElementData('zoom');
    },
    setDefaultZoom: function(newZoom)
    {
        return this.setElementData('zoom', newZoom);
    },
    putDefaultZoom: function()
    {
        var zoom = this.getDefaultZoom();
        if (zoom !== '')
        {
            this.map.setZoom(parseInt(zoom));
            return true;
        }
        return false;
    },
    
    addMarker: function(data, index)
    {
        var o = new ASGmaps_Marker(data, this);
        (o.init() ? this.markers[index] = o : window.ASGmaps.debugMessage("Marker can't added", index, 'error'));
    },
    deleteMarker: function(index)
    {
        if (this.markers[index] !== 'undefined' && this.markers[index] !== null)
        {
            this.markers[index].overlay.setMap(null);
            this.markers[index] = null;
            delete this.markers[index];
            return true;
        }
        return false;
    },
    clearMarkers: function()
    {
        if (typeof markers === 'object')
        {
            var l = markers.length;
            if (l>0)
            {
                var i;
                for (i=0; i<l; ++i)
                {
                    this.deleteMarker(i);
                }
            }
            return true;
        }
    },
    
    getElementData: function(dataName, defaultData)
    {
        defaultData = ('undefined' === typeof defaultData) ? '' : defaultData;
        var data = (this.element.dataset.hasOwnProperty(dataName)) ? this.element.dataset[dataName] : defaultData;
        var jsonData = window.ASGmaps.isJSON(data);
        return jsonData ? jsonData : ((data==='1' || data.toLowerCase()==='true' || data.toLowerCase()==='on') ? true : data);
    },
    setElementData: function(dataName, dataValue)
    {
        return (this.element.dataset[dataName] = dataValue);
    }
};

/* MARKER */
var ASGmaps_Marker = function(data, map)
{
    this.data = data;
    this.asgmap = map;
};
ASGmaps_Marker.prototype = {
    constructor: ASGmaps_Marker,
    asgmap: null,
    data: null,
    latlng: null,
    overlay: null,
    icon: null,
    infoWindow: null,
    ajaxInfoWindowCalling: false,
    
    init: function(){
        this.initIcon();
        if (typeof this.data.latitude !== 'undefined' && this.data.latitude !== '' && typeof this.data.longitude !== 'undefined' && this.data.longitude !=='')
        {
            this.latlng = new google.maps.LatLng(this.data.latitude, this.data.longitude);
            this.showMarker();
            return true;
        }
        else if (typeof this.data.address !== 'undefined' && this.data.address !== '')
        {
            var marker = this;
            window.ASGmaps.geocoder.geocode(
                {'address': this.data.address},
                function(results, status)
                {
                    if (status === google.maps.GeocoderStatus.OK)
                    {
                        marker.latlng = results[0].geometry.location;
                        marker.showMarker();
                    }
                }
            );
            return true;
        }
        return false;
    },
    
    initIcon: function()
    {
        this.icon = (typeof this.data.icon !== 'undefined') ? this.data.icon : window.ASGmaps.cloneObject(this.asgmap.icon);
        if (this.icon !== null)
        {
            ((typeof this.icon.anchor === 'object') ? (this.icon.anchor = new google.maps.Point(this.icon.anchor[0], this.icon.anchor[1])) : (delete this.icon.anchor));
            ((typeof this.icon.origin === 'object') ? (this.icon.origin = new google.maps.Point(this.icon.origin[0], this.icon.origin[1])) : (delete this.icon.origin));
            ((typeof this.icon.size === 'object') ? (this.icon.size = new google.maps.Size(this.icon.size[0], this.icon.size[1])) : (delete this.icon.size));
        }
    },
    initInfoWindow: function()
    {
        this.infoWindow = new google.maps.InfoWindow();
    },
    initInfoWindowContent: function()
    {
        if (typeof this.data.infoWindow !== 'undefined')
        {
            var infoWindowContent = window.ASGmaps.decodeHtmlEntity(this.data.infoWindow);
            if (infoWindowContent !== '')
            {
                this.infoWindow.setContent(infoWindowContent);
                var marker = this;
                google.maps.event.addListener(this.overlay, 'click', function(){
                    marker.infoWindow.open(marker.asgmap.map, marker.overlay);
                });
                return true;
            }
        }
        return false;
    },
    initInfoWindowAjax: function()
    {
        if (typeof this.data.infoWindowAjax !== 'undefined')
        {
            var infoWindowAjax = window.ASGmaps.decodeHtmlEntity(this.data.infoWindowAjax);
            if (infoWindowAjax !== '')
            {
                var marker = this;
                google.maps.event.addListener(this.overlay, 'click', function(){
                    if (!marker.ajaxInfoWindowCalling)
                    {
                        marker.ajaxInfoWindowCalling = true;
                        window.ASGmaps.ajaxCall(infoWindowAjax, function(responseContent){
                            marker.ajaxInfoWindowCalling = false;
                            marker.infoWindow.setContent(responseContent);
                            marker.infoWindow.open(marker.asgmap.map, marker.overlay);
                        }, function(){
                            marker.ajaxInfoWindowCalling = false;
                        });
                    }
                });
                return true;
            }
        }
        return false;
    },
    initButton: function()
    {
        if (typeof this.data.url !== 'undefined')
        {
            var url = window.ASGmaps.decodeHtmlEntity(this.data.url);
            if (url !== '')
            {
                google.maps.event.addListener(this.overlay, 'click', function(){
                    window.location.href = url;
                });
                return true;
            }
        }
        return false;
    },
    
    showMarker: function()
    {
        this.overlay = new google.maps.Marker({
            position: this.latlng,
            map: this.asgmap.map,
            icon: this.icon
        });
        if (this.asgmap.fitMarkers)
        {
            this.asgmap.bounds.extend(this.latlng);
            this.asgmap.map.fitBounds(this.asgmap.bounds);
        }
        this.initInfoWindow();
        (this.initInfoWindowAjax() || this.initInfoWindowContent() || this.initButton());
    }
}

window.ASGmaps = new ASGmaps_Factory();
window.onload = function()
{
    window.ASGmaps.loadGmaps();
};
