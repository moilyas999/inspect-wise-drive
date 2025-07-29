import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBusinessData, Inspector } from '@/hooks/useBusinessData';
import { useToast } from '@/hooks/use-toast';
import StaffManagementModal from '@/components/StaffManagementModal';
import { 
  Users, 
  UserPlus, 
  RefreshCw,
  MoreHorizontal,
  UserCheck,
  UserX,
  Key,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

const StaffManagement = () => {
  const [staff, setStaff] = useState<Inspector[]>([]);
  const [loading, setLoading] = useState(true);
  const { getStaffMembers, deactivateStaffMember, resetStaffPassword, business, businessId, loading: businessLoading } = useBusinessData();
  const { toast } = useToast();

  const fetchStaff = async () => {
    try {
      setLoading(true);
      console.log('Fetching staff members...');
      
      const staffMembers = await getStaffMembers();
      console.log('Staff members fetched:', staffMembers);
      
      if (Array.isArray(staffMembers)) {
        setStaff(staffMembers);
        if (staffMembers.length === 0) {
          console.log('No staff members found');
        }
      } else {
        console.error('Staff members is not an array:', staffMembers);
        setStaff([]);
      }
    } catch (error: any) {
      console.error('Error fetching staff:', error);
      toast({
        title: "Error Loading Staff",
        description: error.message || "Failed to load staff members. Please refresh the page.",
        variant: "destructive",
      });
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch staff when business data is loaded and businessId is available
    if (!businessLoading && businessId) {
      fetchStaff();
    } else if (!businessLoading && !businessId) {
      // Business data loaded but no businessId found
      setLoading(false);
      setStaff([]);
    }
  }, [businessLoading, businessId]);

  const handleDeactivateStaff = async (inspectorId: string, name: string) => {
    try {
      const result = await deactivateStaffMember(inspectorId);
      if (result.success) {
        toast({
          title: "Staff Member Deactivated",
          description: `${name} has been deactivated`,
        });
        fetchStaff(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: "Failed to deactivate staff member",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (email: string, name: string) => {
    try {
      const result = await resetStaffPassword(email);
      if (result.success && result.password) {
        toast({
          title: "Password Reset Successful",
          description: (
            <div className="space-y-2">
              <p>New password for <strong>{name}</strong>:</p>
              <div className="p-2 bg-muted rounded font-mono text-sm">
                <strong>Email:</strong> {result.email}<br/>
                <strong>Password:</strong> {result.password}
              </div>
              <p className="text-xs text-muted-foreground">Please share these credentials securely with the staff member.</p>
            </div>
          ),
          duration: 10000,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to reset password",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading staff members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Staff Management</h2>
          <p className="text-muted-foreground">
            Manage inspector accounts for {business?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStaff}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <StaffManagementModal onStaffCreated={fetchStaff}>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" />
              Add Staff Member
            </Button>
          </StaffManagementModal>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Staff</CardTitle>
            <div className="text-2xl font-bold text-primary">{staff.length}</div>
          </CardHeader>
        </Card>
        <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <div className="text-2xl font-bold text-success">
              {staff.filter(s => s.status === 'active').length}
            </div>
          </CardHeader>
        </Card>
        <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
            <div className="text-2xl font-bold text-muted-foreground">
              {staff.filter(s => s.status === 'inactive').length}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Staff List */}
      <Card className="shadow-card border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Staff Members
          </CardTitle>
          <CardDescription>
            Manage your inspection team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Staff Members</h3>
              <p className="text-muted-foreground mb-4">
                Add inspector accounts to start managing your team.
              </p>
              <StaffManagementModal onStaffCreated={fetchStaff}>
                <Button className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Add First Staff Member
                </Button>
              </StaffManagementModal>
            </div>
          ) : (
            <div className="space-y-4">
              {staff.map((member) => (
                <div 
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-foreground">{member.name}</h4>
                      <Badge 
                        variant={member.status === 'active' ? 'default' : 'secondary'}
                        className={member.status === 'active' ? 'bg-success hover:bg-success/80' : ''}
                      >
                        <UserCheck className="w-3 h-3 mr-1" />
                        {member.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Added {format(new Date(member.created_at), 'PPp')}
                    </p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem 
                        onClick={() => handleResetPassword(member.email, member.name)}
                        className="gap-2"
                      >
                        <Key className="w-4 h-4" />
                        Reset Password
                      </DropdownMenuItem>
                      
                      {member.status === 'active' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeactivateStaff(member.id, member.name)}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <UserX className="w-4 h-4" />
                            Deactivate
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffManagement;