mapboxgl.accessToken = 'pk.eyJ1Ijoiemhhbmd5dWMyMSIsImEiOiJjbTZmYXQ4MHEwMzZ5Mm1vdDF3ZzJ1dG0xIn0.C5cWrhKHt5BdYRDPF0YIqQ';

// 如果你还在用 gzip 的 counties，可以保留这个函数
function fetchAndDecompressGeoJSON(url) {
    return fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load ${url}, status: ${response.status}`);
            }
            return response.arrayBuffer();
        })
        .then(buffer => {
            try {
                const decompressed = pako.inflate(new Uint8Array(buffer), { to: "string" });
                return JSON.parse(decompressed);
            } catch (err) {
                throw new Error("Gzip decompression failed: " + err.message);
            }
        });
}

var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10',
    center: [-98, 38.88],
    minZoom: 2,
    zoom: 3
});

map.on('load', function () {
    console.log("Map loaded successfully!");

    // 通用：按 dom_gen 上色的表达式（用于 polygon）
    const genColorByDomGen = [
        'match',
        ['get', 'dom_gen'],   // 假设 polygon 里有 dom_gen 字段
        'silent',    '#8d6e63',
        'boomer',    '#ffb300',
        'genx',      '#42a5f5',
        'mill',      '#66bb6a',
        'genz',      '#ab47bc',
        'alpha',     '#ef5350',
        /* other */  '#9e9e9e'
    ];

    // 通用：按 gen 上色的表达式（用于 points）
    const genColorByGen = [
        'match',
        ['get', 'gen'],       // 假设点数据里用 gen 字段标记世代
        'silent',    '#8d6e63',
        'boomer',    '#ffb300',
        'genx',      '#42a5f5',
        'mill',      '#66bb6a',
        'genz',      '#ab47bc',
        'alpha',     '#ef5350',
        /* other */  '#9e9e9e'
    ];

    // ---------- 1. 多边形底色：States ----------

    map.addSource('states_polys', {
        type: 'geojson',
        data: './data/genZ_states_with_domgen.geojson'   // ← 正确：多边形
    });

    map.addLayer({
        id: 'states-gen-fill',
        type: 'fill',
        source: 'states_polys',
        paint: {
           'fill-color': genColorByDomGen,
           'fill-opacity': 0.25
        },
        maxzoom: 5.5
    });


    // ---------- 2. 多边形底色：Counties ----------

    map.addSource('counties_polys', {
        type: 'geojson',
        data: './data/genZ_counties_with_domgen.geojson'
    });

    map.addLayer({
        id: 'counties-gen-fill',
        type: 'fill',
        source: 'counties_polys',
        paint: {
            'fill-color': genColorByDomGen,
            'fill-opacity': 0.3
        },
        minzoom: 5
    });


    // ---------- 3. 点数据：State-level generational points ----------

    map.addSource('gen_states_points', {
        type: 'geojson',
        data: './data/gen_multi_states_points.geojson'
    });

    map.addLayer({
        id: 'gen-states-layer',
        type: 'circle',
        source: 'gen_states_points',
        paint: {
            'circle-color': genColorByGen,
            'circle-opacity': 0.8,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 0.5,
            'circle-radius': [
                'interpolate', ['linear'],
                ['sqrt', ['coalesce', ['get', 'pop'], 0]],
                100,    2,
                1000,   3,
                10000,  5,
                100000, 8,
                1000000, 12,
                8000000, 16
            ]
        },
        maxzoom: 5.5
    });

    // ---------- 4. 点数据：County-level generational points ----------

    map.addSource('gen_counties_points', {
        type: 'geojson',
        data: './data/gen_multi_counties_points.geojson'
    });

    map.addLayer({
        id: 'gen-counties-layer',
        type: 'circle',
        source: 'gen_counties_points',
        paint: {
            'circle-color': genColorByGen,
            'circle-opacity': 0.85,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 0.5,
            'circle-radius': [
                'interpolate', ['linear'],
                ['sqrt', ['coalesce', ['get', 'pop'], 0]],
                100,    1.5,
                1000,   2.5,
                10000,  4,
                100000, 6,
                1000000, 9,
                2000000, 12
            ]
        },
        minzoom: 5
    });

    // ---------- 5. Legend ----------

    var legend = document.createElement('div');
    legend.id = 'legend';
    legend.style.position = 'absolute';
    legend.style.bottom = '10px';
    legend.style.left = '10px';
    legend.style.background = 'white';
    legend.style.padding = '6px 8px';
    legend.style.fontSize = '10px';
    legend.style.textAlign = 'left';
    legend.style.boxShadow = '0 0 6px rgba(0,0,0,0.2)';
    legend.style.borderRadius = '4px';
    document.body.appendChild(legend);

    function updateLegend(zoomLevel) {
        let levelLabel = zoomLevel < 5 ? "State focus" : "County focus";

        legend.innerHTML = `
            <strong style="font-size:12px;">US Generations (${levelLabel})</strong><br>
            <div style="margin-top:4px;">
                <span style="display:inline-block;width:10px;height:10px;background:#8d6e63;margin-right:4px;"></span> Silent<br>
                <span style="display:inline-block;width:10px;height:10px;background:#ffb300;margin-right:4px;"></span> Boomer<br>
                <span style="display:inline-block;width:10px;height:10px;background:#42a5f5;margin-right:4px;"></span> Gen X<br>
                <span style="display:inline-block;width:10px;height:10px;background:#66bb6a;margin-right:4px;"></span> Millennial<br>
                <span style="display:inline-block;width:10px;height:10px;background:#ab47bc;margin-right:4px;"></span> Gen Z<br>
                <span style="display:inline-block;width:10px;height:10px;background:#ef5350;margin-right:4px;"></span> Gen Alpha<br>
            </div>
            <div style="margin-top:4px;font-size:9px;line-height:1.3;">
                Polygon color = dominant generation in that state/county.<br>
                Points = sampled population of each generation.
            </div>
        `;
    }

    map.on('zoom', function () {
        updateLegend(map.getZoom());
    });

    updateLegend(map.getZoom());

    // ---------- 6. Tooltip：点击多边形交互，点不交互 ----------

    var tooltip = document.createElement('div');
    tooltip.id = 'tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.background = 'white';
    tooltip.style.padding = '6px 8px';
    tooltip.style.border = '1px solid #ccc';
    tooltip.style.display = 'none';
    tooltip.style.fontSize = '10px';
    tooltip.style.textAlign = 'left';
    tooltip.style.boxShadow = '2px 2px 10px rgba(0,0,0,0.2)';
    tooltip.style.borderRadius = '5px';
    tooltip.style.pointerEvents = 'auto';
    document.body.appendChild(tooltip);

    var closeButton = document.createElement('span');
    closeButton.innerHTML = '&times;';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '3px';
    closeButton.style.right = '5px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '14px';
    closeButton.onclick = function () {
        tooltip.style.display = 'none';
    };
    tooltip.appendChild(closeButton);

    function formatNumber(num) {
        if (num == null || isNaN(num)) return "No Data";
        return Math.round(num).toLocaleString();
    }

    var genLabelMap = {
        'silent': 'Silent',
        'boomer': 'Boomer',
        'genx': 'Gen X',
        'mill': 'Millennial',
        'genz': 'Gen Z',
        'alpha': 'Gen Alpha',
        'none': 'None'
    };

    // 点击多边形（州或县），显示 tooltip；点图层不参与交互
    map.on('click', function (e) {
        var features = map.queryRenderedFeatures(e.point, {
            layers: ['states-gen-fill', 'counties-gen-fill']   // 👈 只查多边形图层
        });

        if (!features.length) {
            return;
        }

        var feat = features[0];
        var props = feat.properties || {};
        var level = (feat.layer.id === 'states-gen-fill') ? 'State' : 'County';

        var domKey = props.dom_gen;
        var domLabel = genLabelMap[domKey] || domKey || 'Unknown';

        // 可选：如果你的 polygon 有各代人口字段，可以在这里显示：
        // 例如 pop_silent, pop_boomer, pop_genx, pop_mill, pop_genz, pop_alpha
        var lineSilent  = props.pop_silent  ? `<br>Silent: ${formatNumber(props.pop_silent)}`   : "";
        var lineBoomer  = props.pop_boomer  ? `<br>Boomer: ${formatNumber(props.pop_boomer)}`   : "";
        var lineGenX    = props.pop_genx    ? `<br>Gen X: ${formatNumber(props.pop_genx)}`       : "";
        var lineMill    = props.pop_mill    ? `<br>Millennial: ${formatNumber(props.pop_mill)}` : "";
        var lineGenZ    = props.pop_genz    ? `<br>Gen Z: ${formatNumber(props.pop_genz)}`       : "";
        var lineAlpha   = props.pop_alpha   ? `<br>Gen Alpha: ${formatNumber(props.pop_alpha)}`  : "";

        tooltip.innerHTML = `
            <strong style="font-size:13px;">${props.NAME || 'Unknown'}</strong><br>
            <span style="font-size:10px;color:#666;">${level}-level polygon</span><br><br>
            <strong>Dominant generation:</strong> ${domLabel}
            ${lineSilent}
            ${lineBoomer}
            ${lineGenX}
            ${lineMill}
            ${lineGenZ}
            ${lineAlpha}
        `;
        tooltip.appendChild(closeButton);

        tooltip.style.left = (e.originalEvent.pageX + 10) + 'px';
        tooltip.style.top = (e.originalEvent.pageY + 10) + 'px';
        tooltip.style.display = 'block';
    });

    // 鼠标移动时，只对多边形改变光标；点图层不会影响
    map.on('mousemove', function (e) {
        var features = map.queryRenderedFeatures(e.point, {
            layers: ['states-gen-fill', 'counties-gen-fill']   // 👈 只查多边形
        });
        map.getCanvas().style.cursor = features.length ? 'pointer' : '';
    });
});
