import os
import csv
import json
import itertools
import re
import copy

from utils import is_ext, strip_ext


def convert_transactions(trans_path='all_trans', convert_all=False):
    fnames = os.listdir(trans_path)
    if convert_all:
        fnames_to_convert = [f for f in fnames if is_ext(f, 'csv')]
    else:
        csv_fnames = [strip_ext(f) for f in fnames if is_ext(f, 'csv')]
        json_fnames = [strip_ext(f) for f in fnames if is_ext(f, 'json')]
        fnames_to_convert = [f + '.csv' for f in (set(csv_fnames) - set(json_fnames))]
    for fname in fnames_to_convert:
        with open(os.path.join(trans_path, fname), 'r') as f:
            csv_reader = csv.DictReader(_lower_first(f))
            trans = json.loads(json.dumps([r for r in csv_reader]))
            trans = standardize_transactions(trans, fname)
            json.dump(trans, open(os.path.join(trans_path, strip_ext(fname) + '.json'), 'w'))


def _lower_first(iterator):
    return itertools.chain([next(iterator).lower()], iterator)


def standardize_transactions(trans, fname):
    pc_fields = ['date', 'account', 'description', 'category', 'tags', 'amount']
    other_fields = ['comment', 'source', 'id', 'type', 'hidden_notes']
    standard_fields = set(pc_fields + other_fields)
    if standard_fields.issubset(set(trans[0].keys())):
        return trans
    drop_ids = []
    all_new_transactions = []
    for t_counter, t in enumerate(trans):
        t, new_transactions = fill_transaction(t, fname, t_counter)
        if new_transactions is not None:
            drop_ids.append(t['id'])
            all_new_transactions += new_transactions
    return [t for t in trans if t['id'] not in drop_ids] + all_new_transactions


def fill_transaction(t, source, t_id):
    t['source'] = source
    t['id'] = f'trans{t_id}'
    t['comment'] = ''
    t['hidden_notes'] = []
    t['tags'] = []
    t['amount'] = float(t['amount'])
    t['type'] = 'income' if t['amount'] > 0 else 'expense'
    t['amount'] = abs(t['amount'])
    if not re.search('::', t['description']):
        return t, None
    spl = t['description'].split('::')
    t['description'] = spl[0]
    if len(spl) % 2 != 1:
        msg = f'Mismatch in parsing transaction description "{t["description"]}"'
        raise ValueError(msg)
    num_field_alts = int((len(spl) - 1) / 2)
    num_trans = max(len(spl[2 * alt + 2].split(';;')) for alt in range(num_field_alts))
    if num_trans == 1:
        for alt in range(num_field_alts):
            key = spl[2 * alt + 1]
            value = re.sub('^{', '', re.sub('}$', '', spl[2 * alt + 2]))
            t[key] = value
        return t, None
    new_transactions = [copy.deepcopy(t) for _ in range(num_trans)]
    for alt in range(num_field_alts):
        key = spl[2 * alt + 1]
        value = re.sub('^{', '', re.sub('}$', '', spl[2 * alt + 2]))
        values = value.split(';;')
        for new_i, new_t in enumerate(new_transactions):
            new_t[key] = values[new_i if len(values) > new_i else -1]
            new_t = fill_transaction(new_t, source, f'{t_id}_{new_i}')
    return t, new_transactions


if __name__ == '__main__':
    convert_transactions()