import React from 'react';
import PropTypes from 'prop-types';
import { Chip, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import PendingIcon from '@mui/icons-material/Pending';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import BlockIcon from '@mui/icons-material/Block';
import HelpIcon from '@mui/icons-material/Help';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';

// Styled component for custom badge sizes
const StyledChip = styled(Chip)(({ theme, size, variant }) => ({
  fontWeight: 500,
  ...(size === 'small' && {
    height: 20,
    fontSize: '0.75rem',
    '.MuiChip-icon': {
      fontSize: '0.875rem',
      marginLeft: 4,
      marginRight: -4,
    },
  }),
  ...(size === 'medium' && {
    height: 24,
    fontSize: '0.8125rem',
    '.MuiChip-icon': {
      fontSize: '1rem',
      marginLeft: 5,
      marginRight: -4,
    },
  }),
  ...(size === 'large' && {
    height: 32,
    fontSize: '0.875rem',
    '.MuiChip-icon': {
      fontSize: '1.25rem',
      marginLeft: 6,
      marginRight: -4,
    },
  }),
  ...(variant === 'outlined' && {
    border: '1px solid',
  }),
}));

/**
 * StatusBadge component for displaying status information with appropriate colors and icons
 * 
 * @param {Object} props - Component props
 * @param {string} props.status - Status text to display
 * @param {string} props.type - Type of status (incident, equipment, task, etc.)
 * @param {string} props.size - Size of the badge (small, medium, large)
 * @param {string} props.variant - Variant of the badge (filled, outlined)
 * @param {boolean} props.withIcon - Whether to show an icon
 * @param {boolean} props.withTooltip - Whether to show a tooltip with description
 * @param {string} props.tooltipText - Custom tooltip text (overrides default)
 * @param {Object} props.customColor - Custom color object with main and contrastText properties
 * @returns {JSX.Element} StatusBadge component
 */
const StatusBadge = ({
  status,
  type = 'incident',
  size = 'medium',
  variant = 'filled',
  withIcon = true,
  withTooltip = true,
  tooltipText = '',
  customColor = null,
  ...props
}) => {
  // Normalize status to lowercase for consistent mapping
  const normalizedStatus = status.toLowerCase();

  // Status configurations for different types
  const statusConfigs = {
    incident: {
      new: {
        color: 'info',
        icon: <InfoIcon />,
        description: 'Incident has been reported but not yet assigned'
      },
      assigned: {
        color: 'primary',
        icon: <AssignmentTurnedInIcon />,
        description: 'Incident has been assigned to a technician'
      },
      in_progress: {
        color: 'warning',
        icon: <HourglassEmptyIcon />,
        description: 'Technician is actively working on the incident'
      },
      on_hold: {
        color: 'secondary',
        icon: <PendingIcon />,
        description: 'Incident resolution is temporarily paused'
      },
      resolved: {
        color: 'success',
        icon: <CheckCircleIcon />,
        description: 'Incident has been successfully resolved'
      },
      closed: {
        color: 'default',
        icon: <BlockIcon />,
        description: 'Incident has been closed'
      },
      reopened: {
        color: 'error',
        icon: <ErrorIcon />,
        description: 'Previously resolved incident has been reopened'
      },
      escalated: {
        color: 'error',
        icon: <WarningIcon />,
        description: 'Incident has been escalated to higher support level'
      },
      pending: {
        color: 'secondary',
        icon: <ScheduleIcon />,
        description: 'Waiting for additional information or action'
      }
    },
    equipment: {
      available: {
        color: 'success',
        icon: <CheckCircleIcon />,
        description: 'Equipment is available for use'
      },
      in_use: {
        color: 'primary',
        icon: <InfoIcon />,
        description: 'Equipment is currently in use'
      },
      maintenance: {
        color: 'warning',
        icon: <WarningIcon />,
        description: 'Equipment is undergoing maintenance'
      },
      repair: {
        color: 'error',
        icon: <ErrorIcon />,
        description: 'Equipment is being repaired'
      },
      retired: {
        color: 'default',
        icon: <BlockIcon />,
        description: 'Equipment has been retired from service'
      },
      reserved: {
        color: 'secondary',
        icon: <ScheduleIcon />,
        description: 'Equipment is reserved for future use'
      }
    },
    task: {
      todo: {
        color: 'info',
        icon: <InfoIcon />,
        description: 'Task is pending'
      },
      in_progress: {
        color: 'warning',
        icon: <HourglassEmptyIcon />,
        description: 'Task is in progress'
      },
      done: {
        color: 'success',
        icon: <CheckCircleIcon />,
        description: 'Task is completed'
      },
      blocked: {
        color: 'error',
        icon: <BlockIcon />,
        description: 'Task is blocked'
      }
    },
    priority: {
      low: {
        color: 'success',
        icon: <InfoIcon />,
        description: 'Low priority'
      },
      medium: {
        color: 'warning',
        icon: <WarningIcon />,
        description: 'Medium priority'
      },
      high: {
        color: 'error',
        icon: <ErrorIcon />,
        description: 'High priority'
      },
      critical: {
        color: 'error',
        icon: <ErrorIcon />,
        description: 'Critical priority - requires immediate attention'
      }
    }
  };

  // Default status configuration if the specific status is not found
  const defaultConfig = {
    color: 'default',
    icon: <HelpIcon />,
    description: `Status: ${status}`
  };

  // Get the appropriate status configuration
  const typeConfigs = statusConfigs[type] || {};
  const statusConfig = typeConfigs[normalizedStatus] || defaultConfig;

  // Use custom color if provided
  const chipColor = customColor ? undefined : statusConfig.color;
  const chipStyle = customColor ? {
    backgroundColor: variant === 'filled' ? customColor.main : 'transparent',
    color: variant === 'filled' ? customColor.contrastText : customColor.main,
    borderColor: customColor.main
  } : {};

  // Determine the icon to display
  const icon = withIcon ? statusConfig.icon : null;

  // Determine the tooltip text
  const finalTooltipText = tooltipText || statusConfig.description;

  // Render the badge with or without tooltip
  const badge = (
    <StyledChip
      label={status}
      color={chipColor}
      size={size}
      variant={variant}
      icon={icon}
      style={chipStyle}
      {...props}
    />
  );

  return withTooltip ? (
    <Tooltip title={finalTooltipText} arrow>
      {badge}
    </Tooltip>
  ) : badge;
};

StatusBadge.propTypes = {
  status: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['incident', 'equipment', 'task', 'priority']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  variant: PropTypes.oneOf(['filled', 'outlined']),
  withIcon: PropTypes.bool,
  withTooltip: PropTypes.bool,
  tooltipText: PropTypes.string,
  customColor: PropTypes.shape({
    main: PropTypes.string,
    contrastText: PropTypes.string
  })
};

export default StatusBadge;