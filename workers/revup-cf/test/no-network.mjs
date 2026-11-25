// Unit tests have no implicit network authority. Individual tests may inject a
// deterministic fetch stub; restore this guard afterwards, never native fetch.
globalThis.fetch=async()=>{throw new Error('unit_network_disabled: use an injected fixture or separate approved hosted acceptance');};
