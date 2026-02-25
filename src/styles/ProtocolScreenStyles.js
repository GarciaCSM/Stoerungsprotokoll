// ProtocolScreenStyles.js
// Delegates to focused sub-files — add new styles in the matching file under styles/protocol/.
import headerStyles  from './protocol/headerStyles';
import faStyles      from './protocol/faStyles';
import sollIstStyles from './protocol/sollIstStyles';
import actionStyles  from './protocol/actionStyles';
import logsStyles    from './protocol/logsStyles';

const protocolScreenStyles = {
  ...headerStyles,
  ...faStyles,
  ...sollIstStyles,
  ...actionStyles,
  ...logsStyles,
};

export default protocolScreenStyles;
