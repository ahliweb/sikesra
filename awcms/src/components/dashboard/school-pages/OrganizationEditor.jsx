import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LocalizedInput from '@/components/ui/LocalizedInput';
import { PositionArrayEditor } from '@/components/ui/PositionArrayEditor';

function OrganizationEditor({ data = {}, updateTopLevel }) {
  const [activeOrg, setActiveOrg] = useState('school');

  const orgTypes = [
    { id: 'school', label: 'School Structure', key: 'schoolOrganization' },
    { id: 'committee', label: 'Committee', key: 'committeeOrganization' },
    { id: 'osis', label: 'OSIS', key: 'osisOrganization' },
    { id: 'mpk', label: 'MPK', key: 'mpkOrganization' },
  ];

  const currentOrg = orgTypes.find((org) => org.id === activeOrg);
  const currentData = data?.[currentOrg?.key] || {};

  const handleOrgChange = (field, value) => {
    updateTopLevel(currentOrg.key, {
      ...currentData,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeOrg} onValueChange={setActiveOrg}>
        <TabsList className="grid w-full grid-cols-4">
          {orgTypes.map((org) => (
            <TabsTrigger key={org.id} value={org.id}>{org.label}</TabsTrigger>
          ))}
        </TabsList>

        {orgTypes.map((org) => (
          <TabsContent key={org.id} value={org.id} className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{org.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <LocalizedInput
                  label="Title"
                  value={data?.[org.key]?.title}
                  onChange={(value) => handleOrgChange('title', value)}
                />

                {(org.id === 'committee' || org.id === 'osis' || org.id === 'mpk') && (
                  <div>
                    <Label>Period</Label>
                    <Input
                      value={data?.[org.key]?.period || ''}
                      onChange={(event) => handleOrgChange('period', event.target.value)}
                      placeholder="e.g., 2024/2025"
                    />
                  </div>
                )}

                <PositionArrayEditor
                  label="Positions"
                  value={data?.[org.key]?.positions || []}
                  onChange={(value) => handleOrgChange('positions', value)}
                  showPhoto={org.id === 'school'}
                  showClass={org.id === 'osis' || org.id === 'mpk'}
                />

                {org.id === 'mpk' && (
                  <LocalizedInput
                    label="Description"
                    type="textarea"
                    value={data?.[org.key]?.description}
                    onChange={(value) => handleOrgChange('description', value)}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default OrganizationEditor;
