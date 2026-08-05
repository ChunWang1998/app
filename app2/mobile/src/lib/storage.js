/** @deprecated use ./community — kept for import compatibility */
export {
  MAX_COMMENT_LEN,
  MAX_COMMENTS_PER_PLACE,
  fetchVoteState as loadVotes,
  fetchComments as loadComments,
  submitVote,
  submitComment,
  mergeVoteState,
  assertBackendReady,
} from './community';
