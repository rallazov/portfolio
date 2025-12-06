document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('mindmap-container');
    if (!container) return;

    // Function to get current dimensions
    function getDimensions() {
        return {
            width: container.clientWidth,
            height: container.clientHeight
        };
    }

    let { width, height } = getDimensions();

    const colors = {
        companyBg: '#ffffff',
        companyBorder: '#0284c7', // Sky-600 (Darker for better contrast)
        companyText: '#0f172a',   // Slate-900

        toolBg: '#f1f5f9',        // Slate-100
        toolText: '#334155',      // Slate-700
        toolBorder: '#cbd5e1',    // Slate-300

        sharedToolBg: '#e0f2fe',  // Sky-100
        sharedToolText: '#0369a1', // Sky-700
        sharedToolBorder: '#7dd3fc', // Sky-300

        line: '#94a3b8',          // Slate-400 (Much darker for visibility)
        lineHighlight: '#0284c7'
    };

    // Create SVG
    const svg = d3.select('#mindmap-container')
        .html('')
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%') // Allow CSS to control size
        .attr('viewBox', [-width / 2, -height / 2, width, height])
        .attr('preserveAspectRatio', 'xMidYMid meet') // Keep centered
        .style('display', 'block')
        .style('background', '#fafafa'); // Subtle off-white background for the container itself

    // Add Drop Shadow Defs
    const defs = svg.append('defs');

    // Card Shadow
    const cardShadow = defs.append('filter').attr('id', 'card-shadow').attr('height', '130%');
    cardShadow.append('feGaussianBlur').attr('in', 'SourceAlpha').attr('stdDeviation', 4).attr('result', 'blur');
    cardShadow.append('feOffset').attr('in', 'blur').attr('dx', 0).attr('dy', 4).attr('result', 'offsetBlur'); // Vertical shadow
    cardShadow.append('feFlood').attr('flood-color', '#0f172a').attr('flood-opacity', 0.1).attr('result', 'colorBlur');
    cardShadow.append('feComposite').attr('in', 'colorBlur').attr('in2', 'offsetBlur').attr('operator', 'in');
    cardShadow.append('feMerge').call(m => { m.append('feMergeNode'); m.append('feMergeNode').attr('in', 'SourceGraphic'); });

    // Pill Shadow (Subtler)
    const pillShadow = defs.append('filter').attr('id', 'pill-shadow').attr('height', '130%');
    pillShadow.append('feGaussianBlur').attr('in', 'SourceAlpha').attr('stdDeviation', 2).attr('result', 'blur');
    pillShadow.append('feOffset').attr('in', 'blur').attr('dx', 0).attr('dy', 1).attr('result', 'offsetBlur');
    pillShadow.append('feFlood').attr('flood-color', '#0f172a').attr('flood-opacity', 0.05).attr('result', 'colorBlur');
    pillShadow.append('feComposite').attr('in', 'colorBlur').attr('in2', 'offsetBlur').attr('operator', 'in');
    pillShadow.append('feMerge').call(m => { m.append('feMergeNode'); m.append('feMergeNode').attr('in', 'SourceGraphic'); });

    // Group for Zooming
    const g = svg.append('g');

    // Zoom Behavior
    // User requested to avoid accidental scrolling. 
    // We filter out wheel events unless Ctrl key is pressed, or just disable wheel entirely if preferred.
    // Let's implement: Wheel to zoom requires CTRL key (standard access pattern), or user can double click.
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .filter(event => !event.type.includes('wheel') || event.ctrlKey)
        .on('zoom', (event) => g.attr('transform', event.transform));

    svg.call(zoom)
        .on("wheel.zoom", null); // Explicitly unbind default wheel listener if we want NO zoom on scroll at all without key

    // Add a hint for zooming? Or just leave it as pan-only dominant.

    console.log("Loading data for Responsive Layout...");

    d3.json('./src/data/experience.json').then(rawData => {

        const nodes = [];
        const links = [];
        const seenTools = new Map();

        // Process Data (Standard Card/Pill logic from before)
        rawData.children.forEach(company => {
            const companyNode = {
                id: company.name,
                group: 'company',
                role: company.role,
                period: company.period,
                location: company.location,
                width: 160,
                height: 70
            };
            nodes.push(companyNode);

            if (company.children) {
                company.children.forEach(tool => {
                    let toolNode;
                    const toolName = tool.name;
                    if (seenTools.has(toolName)) {
                        toolNode = seenTools.get(toolName);
                        toolNode.count++;
                        toolNode.group = 'sharedTool';
                    } else {
                        const approxWidth = Math.max(70, toolName.length * 8 + 20);
                        toolNode = { id: toolName, group: 'tool', count: 1, width: approxWidth, height: 30 };
                        seenTools.set(toolName, toolNode);
                        nodes.push(toolNode);
                    }
                    links.push({ source: companyNode.id, target: toolNode.id });
                });
            }
        });

        // Simulation
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(d => d.group === 'tool' ? 40 : 90)) // REDUCED DISTANCE (was 60/120)
            .force('charge', d3.forceManyBody().strength(d => d.group === 'company' ? -1200 : -200)) // Slightly reduced repulsion
            .force('collide', d3.forceCollide().radius(d => Math.max(d.width, d.height) / 1.6).iterations(2)) // Slightly tighter collision
            .force('center', d3.forceCenter(0, 0))
            .force('y', d3.forceY(0).strength(0.05));

        // Render Elements
        // Links as Curves
        const link = g.append('g').selectAll('path').data(links).join('path')
            .attr('fill', 'none') // Important for paths
            .attr('stroke', colors.line)
            .attr('stroke-opacity', 0.4) // Slightly transparent/subtle
            .attr('stroke-width', 1.5);

        const node = g.append('g').selectAll('g').data(nodes).join('g')
            .attr('class', 'node').style('cursor', 'pointer').call(drag(simulation));

        // Draw Companies (Premium Cards)
        const companies = node.filter(d => d.group === 'company');
        companies.append('rect')
            .attr('width', d => d.width).attr('height', d => d.height)
            .attr('x', d => -d.width / 2).attr('y', d => -d.height / 2)
            .attr('rx', 12).attr('ry', 12)
            .attr('fill', colors.companyBg)
            .attr('stroke', '#e2e8f0') // Very subtle border 
            .attr('stroke-width', 1)
            .style('filter', 'url(#card-shadow)');

        // Company Accent (Bottom Strip)
        companies.append('path')
            .attr('d', d => `M${-d.width / 2 + 12},${d.height / 2 - 4} L${d.width / 2 - 12},${d.height / 2 - 4}`)
            .attr('stroke', colors.companyBorder)
            .attr('stroke-width', 3)
            .attr('stroke-linecap', 'round');

        companies.append('text').attr('dy', -8).attr('text-anchor', 'middle')
            .attr('font-size', '15px').attr('font-weight', '700').attr('fill', colors.companyText)
            .style('letter-spacing', '-0.02em')
            .text(d => d.id);
        companies.append('text').attr('dy', 12).attr('text-anchor', 'middle')
            .attr('font-size', '11px').attr('font-weight', '500').attr('fill', '#64748b').text(d => d.role);

        // Draw Tools (Premium Pills)
        const tools = node.filter(d => d.group !== 'company');
        tools.append('rect')
            .attr('width', d => d.width).attr('height', d => d.height)
            .attr('x', d => -d.width / 2).attr('y', d => -d.height / 2)
            .attr('rx', 14).attr('ry', 14) // Fully rounded
            .attr('fill', d => d.group === 'sharedTool' ? colors.sharedToolBg : colors.toolBg)
            .attr('stroke', d => d.group === 'sharedTool' ? colors.sharedToolBorder : colors.toolBorder)
            .attr('stroke-width', 1)
            .style('filter', 'url(#pill-shadow)');

        tools.append('text').attr('dy', 4).attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('font-weight', d => d.group === 'sharedTool' ? '600' : '500')
            .attr('fill', d => d.group === 'sharedTool' ? colors.sharedToolText : colors.toolText)
            .text(d => d.id);

        // Interactions
        const connectedIds = new Map();
        links.forEach(l => {
            const s = l.source.id || l.source;
            const t = l.target.id || l.target;
            if (!connectedIds.has(s)) connectedIds.set(s, new Set());
            if (!connectedIds.has(t)) connectedIds.set(t, new Set());
            connectedIds.get(s).add(t);
            connectedIds.get(t).add(s);
        });

        node.on('mouseover', function (event, d) {
            const neighbors = connectedIds.get(d.id) || new Set();
            neighbors.add(d.id);
            node.transition().duration(200).style('opacity', n => neighbors.has(n.id) ? 1 : 0.15); // Clearer fade
            link.transition().duration(200)
                .style('opacity', l => (neighbors.has(l.source.id) && neighbors.has(l.target.id)) ? 1 : 0.05)
                .attr('stroke', l => (neighbors.has(l.source.id) && neighbors.has(l.target.id)) ? colors.lineHighlight : colors.line)
                .attr('stroke-width', 2);
        }).on('mouseout', function () {
            node.transition().duration(200).style('opacity', 1);
            link.transition().duration(200).style('opacity', 0.4).attr('stroke', colors.line).attr('stroke-width', 1.5);
        });

        simulation.on('tick', () => {
            // Update Curved Paths
            link.attr('d', d => {
                const dx = d.target.x - d.source.x,
                    dy = d.target.y - d.source.y,
                    dr = Math.sqrt(dx * dx + dy * dy);
                // Quadratic curve
                return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            });
            node.attr('transform', d => {
                // Determine radius/size for clamping
                const w = d.width ? d.width / 2 : 20;
                const h = d.height ? d.height / 2 : 20;

                // Keep within bounds (width/height are global from getDimensions)
                // Add a small padding (20px)
                d.x = Math.max(-width / 2 + w + 20, Math.min(width / 2 - w - 20, d.x));
                d.y = Math.max(-height / 2 + h + 20, Math.min(height / 2 - h - 20, d.y));

                return `translate(${d.x},${d.y})`;
            });

            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);
        });

        function drag(sim) {
            return d3.drag()
                .on('start', e => { if (!e.active) sim.alphaTarget(0.3).restart(); e.subject.fx = e.subject.x; e.subject.fy = e.subject.y; })
                .on('drag', e => { e.subject.fx = e.x; e.subject.fy = e.y; })
                .on('end', e => { if (!e.active) sim.alphaTarget(0); e.subject.fx = null; e.subject.fy = null; });
        }

        // --- Window Resize Handling ---
        window.addEventListener('resize', () => {
            // Update dimensions
            const dims = getDimensions();
            // Update global width/height for the clamping logic
            width = dims.width;
            height = dims.height;

            // Update SVG ViewBox
            svg.attr('viewBox', [-width / 2, -height / 2, width, height]);

            // Re-heat simulation to adjust to new bounds if needed (optional)
            simulation.alpha(0.1).restart();
        });

    }).catch(err => console.error(err));
});
