import { useState, useEffect, useRef } from 'react';
import { attendanceAPI, projectAPI } from '@/services/api';
import PageWrapper from '@/components/PageWrapper';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useMessage } from '@/hooks/useMessage';
import logger from '@/lib/logger';
import { ATTENDANCE_STATUS, RECORD_STATUS } from '@/lib/constants';

const ClockIn = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [activeAttendance, setActiveAttendance] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError, showInfo } = useMessage();
  const [autoDetectMode, setAutoDetectMode] = useState(true);
  const [lastClockOutSummary, setLastClockOutSummary] = useState(null);
  const [workData, setWorkData] = useState({
    workUnits: '',
    workType: '',
    extraSiteExpenses: '',
  });
  const lastWatchedPositionRef = useRef(null);

  useEffect(() => {
    fetchProjects();
    checkActiveAttendance();
    getCurrentLocation();

    let watchId = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          lastWatchedPositionRef.current = coords;
          setLocation(coords);
          setLocationError('');
          setLocationLoading(false);
        },
        (error) => {
          handleLocationError(error);
          setLocationLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getOptions({ isActive: true });
      setProjects(response.data?.data ?? []);
    } catch (error) {
      logger.error('Error fetching projects', error);
    }
  };

  const checkActiveAttendance = async () => {
    try {
      const response = await attendanceAPI.getMyAttendance();
      const active = response.data.data.find((a) => a.status === RECORD_STATUS.CLOCKED_IN);
      if (active) {
        setActiveAttendance(active);
        setWorkData({
          workUnits: active.metadata?.workUnits?.toString() || '',
          workType: active.metadata?.workType || '',
          extraSiteExpenses: active.metadata?.extraSiteExpenses?.toString() || '',
        });
      }
    } catch (error) {
      logger.error('Error checking attendance', error);
    }
  };

  const handleLocationError = (error) => {
    let errorMessage = 'Unable to retrieve your location.';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied. Please enable location access in your browser/device settings.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location unavailable. Please ensure GPS is enabled and you have a clear view of the sky.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out. Please try again or move to a location with better GPS signal.';
        break;
      default:
        errorMessage = 'An unknown error occurred while fetching location.';
    }
    setLocationError(errorMessage);
    logger.error('Geolocation error', error);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setLocationLoading(false);
      return;
    }

    const cached = lastWatchedPositionRef.current;
    if (cached) {
      setLocation({ ...cached });
      setLocationError('');
      setLocationLoading(false);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
          lastWatchedPositionRef.current = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
        },
        () => {},
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 10000 }
      );
      return;
    }

    setLocationLoading(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        lastWatchedPositionRef.current = coords;
        setLocation(coords);
        setLocationError('');
        setLocationLoading(false);
      },
      (error) => {
        handleLocationError(error);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 5000,
      }
    );
  };

  const getAccuracyLabel = (accuracy) => {
    if (!accuracy) return 'Unknown';
    if (accuracy <= 10) return 'Excellent';
    if (accuracy <= 30) return 'Good';
    if (accuracy <= 100) return 'Fair';
    return 'Poor';
  };

  const getAccuracyColor = (accuracy) => {
    if (!accuracy) return 'text-gray-500';
    if (accuracy <= 10) return 'text-green-600';
    if (accuracy <= 30) return 'text-green-500';
    if (accuracy <= 100) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getFreshLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const cached = lastWatchedPositionRef.current;
      const maxAgeMs = 20000;
      if (cached && cached.timestamp && Date.now() - cached.timestamp < maxAgeMs) {
        resolve({
          lat: cached.lat,
          lng: cached.lng,
          accuracy: cached.accuracy,
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 10000,
        }
      );
    });
  };

  const handleClockIn = async () => {
    if (!autoDetectMode && !selectedProject) {
      showError('Please select a project');
      return;
    }

    setLoading(true);
    setLastClockOutSummary(null);

    try {
      showInfo('Getting your current location...');
      const freshLocation = await getFreshLocation();

      setLocation({
        ...freshLocation,
        timestamp: Date.now(),
      });

      const payload = {
        coordinates: {
          lat: freshLocation.lat,
          lng: freshLocation.lng,
        },
      };

      if (!autoDetectMode && selectedProject) {
        payload.projectId = selectedProject;
      }

      const response = await attendanceAPI.clockIn(payload);
      setActiveAttendance(response.data.data.attendance);

      if (response.data.data.autoClockOut) {
        showSuccess(`Auto clocked-out from ${response.data.data.autoClockOut.previousProject} (${response.data.data.autoClockOut.hoursWorked}h worked, status: ${response.data.data.autoClockOut.status}) and clocked in to new project!`);
      } else {
        showSuccess('Successfully clocked in!');
      }
    } catch (error) {
      if (error.response) {
        showError(error.response?.data?.message || 'Failed to clock in');
      } else if (typeof error.code === 'number' && error.code >= 1 && error.code <= 3) {
        handleLocationError(error);
        showError('Could not get your location. Please try again.');
      } else {
        showError(error.message || 'Failed to clock in');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);

    try {
      showInfo('Getting your current location...');
      const freshLocation = await getFreshLocation();

      setLocation({
        ...freshLocation,
        timestamp: Date.now(),
      });

      const response = await attendanceAPI.clockOut({
        coordinates: {
          lat: freshLocation.lat,
          lng: freshLocation.lng,
        },
        metadata: {
          workUnits: parseFloat(workData.workUnits) || 0,
          workType: workData.workType,
          extraSiteExpenses: parseFloat(workData.extraSiteExpenses) || 0,
        },
      });

      setLastClockOutSummary(response.data.data.summary);
      setActiveAttendance(null);
      setWorkData({ workUnits: '', workType: '', extraSiteExpenses: '' });
      showSuccess('Successfully clocked out!');
    } catch (error) {
      if (error.response) {
        showError(error.response?.data?.message || 'Failed to clock out');
      } else if (typeof error.code === 'number' && error.code >= 1 && error.code <= 3) {
        handleLocationError(error);
        showError('Could not get your location. Please try again.');
      } else {
        showError(error.message || 'Failed to clock out');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWorkDataChange = (e) => {
    setWorkData({ ...workData, [e.target.name]: e.target.value });
  };

  const updateWorkData = async () => {
    if (!activeAttendance) return;

    setLoading(true);
    try {
      await attendanceAPI.updateMetadata(activeAttendance._id, {
        workUnits: parseFloat(workData.workUnits) || 0,
        workType: workData.workType,
        extraSiteExpenses: parseFloat(workData.extraSiteExpenses) || 0,
      });
      showSuccess('Work data saved!');
    } catch (error) {
      showError('Failed to save work data');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (startTime) => {
    const diff = new Date() - new Date(startTime);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case ATTENDANCE_STATUS.PRESENT:
        return 'bg-green-100 text-green-800';
      case ATTENDANCE_STATUS.PARTIAL:
        return 'bg-yellow-100 text-yellow-800';
      case ATTENDANCE_STATUS.ABSENT:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <PageWrapper
      title="Clock In / Out"
      subtitle="Record your shift and location"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Location */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {locationLoading ? (
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              ) : (
                <div
                  className={cn(
                    'w-2.5 h-2.5 rounded-full',
                    location ? 'bg-green-500' : 'bg-destructive'
                  )}
                />
              )}
              <span className="text-sm font-medium text-foreground">
                {locationLoading ? 'Fetching location…' : location ? 'Location available' : 'Location unavailable'}
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={getCurrentLocation}
              disabled={locationLoading}
            >
              {locationLoading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>

          {location && (
            <div className="rounded-md bg-muted/50 p-3 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Coordinates</span>
                <span className="font-mono text-foreground">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Accuracy</span>
                <span className={cn('font-medium', getAccuracyColor(location.accuracy))}>
                  {getAccuracyLabel(location.accuracy)} (~{Math.round(location.accuracy || 0)}m)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last updated</span>
                <span className="text-foreground">
                  {location.timestamp
                    ? new Date(location.timestamp).toLocaleTimeString()
                    : 'Just now'}
                </span>
              </div>
            </div>
          )}

          {locationError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <p>{locationError}</p>
              <p className="text-xs mt-1 opacity-90">Enable GPS, go outdoors, or try another browser.</p>
            </div>
          )}

          {location && location.accuracy > 100 && (
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
              <p className="font-medium">Low accuracy.</p>
              <p className="text-xs mt-1">Move outdoors, wait for GPS lock, or check device GPS settings.</p>
            </div>
          )}
        </div>

        {/* Clock In / Out */}
        <div className="flex flex-col">
          {activeAttendance ? (
            <div className="rounded-lg border border-border bg-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-foreground">Currently clocked in</h2>
                <span className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400">
                  Active
                </span>
              </div>

              <div className="rounded-md bg-muted/50 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project</span>
                  <span className="font-medium text-foreground">{activeAttendance.projectId?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium text-foreground">{formatDuration(activeAttendance.clockIn)}</span>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <h3 className="text-sm font-medium text-foreground">Log work details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="workUnits" className="text-xs">Work units</Label>
                    <Input
                      id="workUnits"
                      type="number"
                      name="workUnits"
                      value={workData.workUnits}
                      onChange={handleWorkDataChange}
                      placeholder="Units"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="workType" className="text-xs">Work type</Label>
                    <Input
                      id="workType"
                      type="text"
                      name="workType"
                      value={workData.workType}
                      onChange={handleWorkDataChange}
                      placeholder="e.g. Concrete"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="extraSiteExpenses" className="text-xs">Extra expenses</Label>
                    <Input
                      id="extraSiteExpenses"
                      type="number"
                      name="extraSiteExpenses"
                      value={workData.extraSiteExpenses}
                      onChange={handleWorkDataChange}
                      placeholder="0"
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={updateWorkData}
                    disabled={loading}
                  >
                    {loading ? 'Saving…' : 'Save work data'}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleClockOut}
                    disabled={loading}
                    size="sm"
                    className="ml-auto"
                  >
                    {loading ? 'Processing…' : 'Clock out'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-4 space-y-4">
              <h2 className="text-base font-semibold text-foreground">Start your shift</h2>

              <div className="flex items-center justify-between gap-3 rounded-md bg-muted/50 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Auto-detect mode</p>
                  <p className="text-xs text-muted-foreground">Find project from your location</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoDetectMode}
                  onClick={() => setAutoDetectMode(!autoDetectMode)}
                  className={cn(
                    'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    autoDetectMode ? 'bg-primary' : 'bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 rounded-full bg-background shadow transition-transform',
                      autoDetectMode ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {!autoDetectMode && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Select project (manual)</Label>
                  <Select value={selectedProject} onValueChange={setSelectedProject} required>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Choose a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <p className="text-xs text-muted-foreground rounded-md bg-muted/30 p-3">
                {autoDetectMode
                  ? "Project is chosen from your location (you must be assigned to the project). If already clocked in elsewhere, you'll be auto clocked-out first."
                  : "Ensure you're at the project site; location is checked against the project geofence."}
              </p>

              <Button
                onClick={handleClockIn}
                disabled={loading || (!autoDetectMode && !selectedProject)}
                className="w-full"
                size="default"
              >
                {loading ? 'Processing…' : autoDetectMode ? 'Clock in (auto-detect)' : 'Clock in'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Summary + Projects */}
      {(lastClockOutSummary || (projects.length > 0 && !activeAttendance)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lastClockOutSummary && (
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Last session</h3>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xl font-bold text-foreground">{lastClockOutSummary.hoursWorked}h</p>
                  <p className="text-xs text-muted-foreground">Hours worked</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{lastClockOutSummary.minHoursRequired}h</p>
                  <p className="text-xs text-muted-foreground">Required</p>
                </div>
                <div>
                  <span
                    className={cn(
                      'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
                      getStatusBadge(lastClockOutSummary.attendanceStatus)
                    )}
                  >
                    {lastClockOutSummary.attendanceStatus}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">Status</p>
                </div>
              </div>
            </div>
          )}

          {projects.length > 0 && !activeAttendance && (
            <div className="rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Your projects</h3>
              <div className="flex flex-wrap gap-1.5">
                {projects.map((p) => (
                  <span
                    key={p._id}
                    className="inline-flex rounded-md px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
};

export default ClockIn;
