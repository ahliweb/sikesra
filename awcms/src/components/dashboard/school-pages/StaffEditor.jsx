import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LocalizedInput from '@/components/ui/LocalizedInput';
import { StaffArrayEditor } from '@/components/ui/PositionArrayEditor';

function StaffEditor({ data = {}, updateTopLevel }) {
  const [activeStaff, setActiveStaff] = useState('teachers');

  return (
    <div className="space-y-4">
      <Tabs value={activeStaff} onValueChange={setActiveStaff}>
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="teachers">Teaching Staff</TabsTrigger>
          <TabsTrigger value="admin">Administrative Staff</TabsTrigger>
        </TabsList>

        <TabsContent value="teachers" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Teaching Council</CardTitle>
              <CardDescription>Manage teacher roster with roles and subjects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <LocalizedInput
                label="Section Title"
                value={data?.teachingStaff?.title}
                onChange={(value) => updateTopLevel('teachingStaff', { ...data?.teachingStaff, title: value })}
              />
              <LocalizedInput
                label="Description"
                type="textarea"
                value={data?.teachingStaff?.description}
                onChange={(value) => updateTopLevel('teachingStaff', { ...data?.teachingStaff, description: value })}
              />
              <StaffArrayEditor
                label="Staff Members"
                value={data?.teachingStaff?.staff || []}
                onChange={(value) => updateTopLevel('teachingStaff', { ...data?.teachingStaff, staff: value })}
                showSubject={true}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Administrative Staff</CardTitle>
              <CardDescription>Non-teaching support staff</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <LocalizedInput
                label="Section Title"
                value={data?.administrativeStaff?.title}
                onChange={(value) => updateTopLevel('administrativeStaff', { ...data?.administrativeStaff, title: value })}
              />
              <StaffArrayEditor
                label="Staff Members"
                value={data?.administrativeStaff?.staff || []}
                onChange={(value) => updateTopLevel('administrativeStaff', { ...data?.administrativeStaff, staff: value })}
                showSubject={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default StaffEditor;
