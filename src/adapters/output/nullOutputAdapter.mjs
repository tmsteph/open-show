export function createNullOutputAdapter() {
  const activationLog = [];

  return {
    async activateCue(cue) {
      activationLog.push({
        cueId: cue.id,
        activatedAt: new Date().toISOString()
      });
    },
    getActivationLog() {
      return [...activationLog];
    }
  };
}
