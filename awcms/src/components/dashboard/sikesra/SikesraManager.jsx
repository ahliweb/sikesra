import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AdminPageLayout, PageHeader } from '@/templates/flowbite-admin';
import { Building2, FileCheck, CheckCircle, FileText, Users, MapPin } from 'lucide-react';
import useSplatSegments from '@/hooks/useSplatSegments';
import { cn } from '@/lib/utils';
import SikesraEntityList from './SikesraEntityList';
import SikesraVerificationInbox from './SikesraVerificationInbox';
import SikesraApprovalInbox from './SikesraApprovalInbox';
import SikesraDocumentManager from './SikesraDocumentManager';
import SikesraMicroRegions from './SikesraMicroRegions';

function SikesraManager() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const segments = useSplatSegments();
  
  const tabValues = ['entities', 'verifications', 'approvals', 'documents', 'regions'];
  const viewValues = ['trash'];
  
  const hasTabSegment = tabValues.includes(segments[0]);
  const hasViewSegment = viewValues.includes(segments[0]);
  
  const activeTab = hasTabSegment ? segments[0] : 'entities';
  const activeView = hasViewSegment ? segments[0] : null;
  
  const [selectedEntityType, setSelectedEntityType] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  
  useEffect(() => {
    if (segments.length > 0 && !hasTabSegment && !hasViewSegment) {
      navigate('/cmspanel/sikesra', { replace: true });
    }
  }, [segments, hasTabSegment, hasViewSegment, navigate]);
  
  const tabs = [
    { value: 'entities', label: t('sikesra.entities', 'Entitas'), icon: Building2, color: 'blue' },
    { value: 'verifications', label: t('sikesra.verifications', 'Verifikasi'), icon: FileCheck, color: 'amber' },
    { value: 'approvals', label: t('sikesra.approvals', 'Persetujuan'), icon: CheckCircle, color: 'emerald' },
    { value: 'documents', label: t('sikesra.documents', 'Dokumen'), icon: FileText, color: 'purple' },
    { value: 'regions', label: t('sikesra.regions', 'Wilayah Mikro'), icon: MapPin, color: 'slate' },
  ];
  
  const breadcrumbs = [
    { label: t('sikesra.title', 'SIKESRA'), href: activeTab !== 'entities' ? '/cmspanel/sikesra' : undefined, icon: Building2 },
    ...(activeView === 'trash' ? [{ label: t('common.trash', 'Sampah') }] : []),
    ...(activeTab !== 'entities' ? [{ label: tabs.find(t => t.value === activeTab)?.label || activeTab }] : []),
  ];
  
  const activeSectionLabel = useMemo(() => {
    if (activeView === 'trash') return t('common.trash', 'Sampah');
    return tabs.find(t => t.value === activeTab)?.label || activeTab;
  }, [activeTab, activeView, t]);
  
  const handleTabChange = (tabValue) => {
    navigate(`/cmspanel/sikesra/${tabValue}`);
  };
  
  const renderActiveContent = () => {
    const showTrash = activeView === 'trash';
    
    switch (activeTab) {
      case 'entities':
        return <SikesraEntityList showTrash={showTrash} />;
      case 'verifications':
        return <SikesraVerificationInbox />;
      case 'approvals':
        return <SikesraApprovalInbox />;
      case 'documents':
        return <SikesraDocumentManager showTrash={showTrash} />;
      case 'regions':
        return <SikesraMicroRegions showTrash={showTrash} />;
      default:
        return <SikesraEntityList showTrash={showTrash} />;
    }
  };
  
  return (
    <AdminPageLayout
      title={t('sikesra.title', 'SIKESRA')}
      subtitle={t('sikesra.subtitle', 'Sistem Informasi Kesejahteraan Rakyat')}
      breadcrumbs={breadcrumbs}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      headerActions={
        <div className="flex items-center gap-2">
          {activeTab === 'entities' && (
            <button
              onClick={() => navigate('/cmspanel/sikesra/entities/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Building2 className="w-4 h-4" />
              {t('common.add_new', 'Tambah Baru')}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {renderActiveContent()}
      </div>
    </AdminPageLayout>
  );
}

export default SikesraManager;
