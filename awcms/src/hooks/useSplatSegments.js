import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

const useSplatSegments = () => {
  const { '*': splat } = useParams();
  return useMemo(() => (splat ? splat.split('/').filter(Boolean) : []), [splat]);
};

export default useSplatSegments;
