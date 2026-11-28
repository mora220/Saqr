export const getMessaging = () => ({});
export const getToken = async () => "mock-token-" + Math.random().toString(36).slice(2, 8);
export const isSupported = async () => false;
export const onMessage = () => () => {};
