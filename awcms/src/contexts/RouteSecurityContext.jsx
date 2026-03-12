import { createContext, useContext } from 'react';

const RouteSecurityContext = createContext(null);

export const useRouteSecurityParams = () => useContext(RouteSecurityContext);

export default RouteSecurityContext;
