switch (status) {
  case 'open':
    return 1;
  case 'closed':
    return 0;
  default:
    return -1;
}
