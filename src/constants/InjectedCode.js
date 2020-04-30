/**
 * The Code to be Injected
 * @type {string}
 * @private
 */
const INJECTED_CODE = `
<!-- Code injected by jolt-server -->
<script>
    const source = new EventSource("/reload");
    const reload = () => window.location.reload();
    source.onmessage = reload;
    source.onerror = () => (source.onopen = reload);
</script>
`;

/* export the injected code */
export default INJECTED_CODE;