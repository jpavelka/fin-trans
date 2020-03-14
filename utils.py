import os
import json
import re

from google.cloud import storage


def strip_ext(fname):
    return '.'.join(fname.split('.')[:-1])


def is_ext(fname, ext):
    spl = fname.split('.')
    return len(spl) > 1 and spl[-1] == ext


def _is_gcs_path(path):
    return re.search('^gs://', path)


def get_dir_filenames(path):
    if _is_gcs_path(path):
        bucket_name, dir_name = gcs_path_to_bucket_and_fname(path)
        client = storage.Client()
        bucket = client.get_bucket(bucket_name)
        print()
    else:
        return os.listdir(path)


def save_as_json(d, data_path):
    if _is_gcs_path(data_path):
        bucket_name, file_name = gcs_path_to_bucket_and_fname(data_path)
        client = storage.Client()
        bucket = client.get_bucket(bucket_name)
        blob = bucket.blob(file_name)
        blob.upload_from_string(json.dumps(d))
    else:
        json.dump(d, open(data_path, 'w'))


def load_from_json(data_path):
    if _is_gcs_path(data_path):
        bucket_name, file_name = gcs_path_to_bucket_and_fname(data_path)
        return _gcs_json_to_dict(bucket_name, file_name)
    else:
        return json.load(open(data_path, 'r'))


def _gcs_json_to_dict(bucket_name, file_name):
    client = storage.Client()
    bucket = client.get_bucket(bucket_name)
    blob = bucket.get_blob(file_name).download_as_string()
    return json.loads(blob.decode())


def load_bytes(load_path):
    if _is_gcs_path(load_path):
        client = storage.Client()
        bucket_name, file_name = gcs_path_to_bucket_and_fname(load_path)
        bucket = client.get_bucket(bucket_name)
        blob = bucket.blob(file_name)
        return blob.download_as_string()
    else:
        with open(load_path, 'rb') as f:
            bytes_string = f.read()
        return bytes_string


def save_bytes(bytes_string, save_path):
    if _is_gcs_path(save_path):
        client = storage.Client()
        bucket_name, file_name = gcs_path_to_bucket_and_fname(save_path)
        bucket = client.get_bucket(bucket_name)
        model_blob = bucket.blob(file_name)
        model_blob.upload_from_string(bytes_string)
    else:
        with open(save_path, 'wb') as f:
            f.write(bytes_string)


def copy_file(from_path, to_path):
    save_bytes(load_bytes(from_path), to_path)


def path_join(*args):
    if _is_gcs_path(args[0]):
        return '/'.join(args)
    else:
        return os.path.join(*args)


def gcs_path_to_bucket_and_fname(data_path):
    bucket_name = data_path.split('gs://')[1].split('/')[0]
    file_name = '/'.join(data_path.split('gs://')[1].split('/')[1:])
    return bucket_name, file_name
