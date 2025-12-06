document.addEventListener('DOMContentLoaded', function () {
    const container = document.getElementById('mindmap-container');
    if (!container) return; // Guard clause

    const width = container.clientWidth;
    const height = 600; // Fixed height for now, could be dynamic

    // Color palette matching the portfolio (Sky Blue / Grays)
    const colors = {
        root: '#0ea5e9', // Sky-500
        company: '#38bdf8', // Sky-400
        details: '#bae6fd', // Sky-200
        text: '#374151', // Gray-700
        line: '#e5e7eb' // Gray-200
    };

    const svg = d3.select('#mindmap-container')
        .append('svg')
        .attr('width', '100%')
        .attr('height', height)
        .attr('viewBox', [-width / 2, -height / 2, width, height])
        .attr('style', 'max-width: 100%; height: auto; height: intrinsic;');

    // Load data
    d3.json('./src/data/experience.json').then(data => {
        const root = d3.hierarchy(data);
        const links = root.links();
        const nodes = root.descendants();

        // Custom force simulation
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.data.name).distance(100).strength(1))
            .force('charge', d3.forceManyBody().strength(-400))
            .force('x', d3.forceX())
            .force('y', d3.forceY());

        // Zoom capability
        const g = svg.append('g');
        svg.call(d3.zoom()
            .scaleExtent([0.5, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            }));

        // Links
        const link = g.append('g')
            .attr('stroke', colors.line)
            .attr('stroke-opacity', 0.6)
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('stroke-width', d => d.target.height === 0 ? 1 : 2); // Thicker for main connections

        // Nodes
        const node = g.append('g')
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5)
            .selectAll('circle')
            .data(nodes)
            .join('circle')
            .attr('r', d => d.depth === 0 ? 25 : (d.depth === 1 ? 15 : 8)) // Size based on hierarchy depth
            .attr('fill', d => d.depth === 0 ? colors.root : (d.depth === 1 ? colors.company : colors.details))
            .call(drag(simulation));

        // Labels
        const label = g.append('g')
            .selectAll('text')
            .data(nodes)
            .join('text')
            .attr('dy', d => d.depth === 0 ? 40 : (d.depth === 1 ? 25 : 15)) // Offset label
            .attr('text-anchor', 'middle')
            .attr('font-size', d => d.depth === 0 ? '16px' : (d.depth === 1 ? '14px' : '10px'))
            .attr('fill', colors.text)
            .attr('pointer-events', 'none') // Let clicks pass through to nodes
            .text(d => d.data.name || d.data.details); // Use name, or specific detail text if structure differs

        // Tooltip (simple browser title for now, could be improved)
        node.append('title')
            .text(d => {
                if (d.depth === 1) return `${d.data.role}\n${d.data.period}\n${d.data.location}`;
                return d.data.name;
            });

        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            label
                .attr('x', d => d.x)
                .attr('y', d => d.y);
        });

        // Drag functions
        function drag(simulation) {
            function dragstarted(event) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }

            function dragged(event) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }

            function dragended(event) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }

            return d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended);
        }
    });
});
