import { useRouteSecurityParams } from '@/contexts/RouteSecurityContext';

const useRouteSecurityParamsHook = () => useRouteSecurityParams() || {};

export default useRouteSecurityParamsHook;
