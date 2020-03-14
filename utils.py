def strip_ext(fname):
    return '.'.join(fname.split('.')[:-1])


def is_ext(fname, ext):
    spl = fname.split('.')
    return len(spl) > 1 and spl[-1] == ext